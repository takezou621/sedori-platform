import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Subscription,
  SubscriptionPlan,
  SubscriptionStatus,
  BillingCycle,
} from './entities/subscription.entity';
import {
  SubscriptionUsage,
  UsageType,
} from './entities/subscription-usage.entity';
import { User } from '../users/entities/user.entity';
import {
  SubscriptionRequestDto,
  SubscriptionUpdateDto,
  SubscriptionResponseDto,
  SubscriptionUsageResponseDto,
  SubscriptionPlanInfoDto,
} from './dto';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(SubscriptionUsage)
    private readonly usageRepository: Repository<SubscriptionUsage>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async createSubscription(
    userId: string,
    subscriptionRequestDto: SubscriptionRequestDto,
  ): Promise<SubscriptionResponseDto> {
    const { plan, billingCycle, paymentMethodId } = subscriptionRequestDto;

    // Check if user exists
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('ユーザーが見つかりません');
    }

    // Check if user already has an active subscription
    const existingSubscription = await this.subscriptionRepository.findOne({
      where: { userId, status: SubscriptionStatus.ACTIVE },
    });

    if (existingSubscription) {
      throw new BadRequestException('既にアクティブなサブスクリプションがあります');
    }

    const planFeatures = this.getPlanFeatures(plan);
    const pricing = this.getPlanPricing(plan);

    // Create subscription
    const subscription = this.subscriptionRepository.create({
      userId,
      plan,
      status: plan === SubscriptionPlan.FREE ? SubscriptionStatus.ACTIVE : SubscriptionStatus.TRIAL,
      billingCycle: billingCycle || BillingCycle.MONTHLY,
      monthlyPrice: pricing.monthlyPrice,
      yearlyPrice: pricing.yearlyPrice,
      startDate: new Date(),
      endDate: plan === SubscriptionPlan.FREE ? undefined : this.calculateEndDate(billingCycle || BillingCycle.MONTHLY) || undefined,
      trialEndDate: plan === SubscriptionPlan.FREE ? undefined : this.calculateTrialEndDate(),
      nextBillingDate: plan === SubscriptionPlan.FREE ? undefined : this.calculateNextBillingDate(billingCycle || BillingCycle.MONTHLY) || undefined,
      usageResetDate: this.calculateUsageResetDate(),
      maxOptimizations: planFeatures.maxOptimizations,
      maxProducts: planFeatures.maxProducts,
      maxApiCalls: planFeatures.maxApiCalls,
      hasAdvancedAnalytics: planFeatures.hasAdvancedAnalytics,
      hasAIRecommendations: planFeatures.hasAIRecommendations,
      hasPrioritySupport: planFeatures.hasPrioritySupport,
      hasWhiteLabel: planFeatures.hasWhiteLabel,
      currentOptimizations: 0,
      currentApiCalls: 0,
    });

    const savedSubscription = await this.subscriptionRepository.save(subscription);

    // Handle payment processing here (Stripe integration)
    if (plan !== SubscriptionPlan.FREE && paymentMethodId) {
      // TODO: Integrate with Stripe
      // const stripeResult = await this.processStripePayment(savedSubscription, paymentMethodId);
      // savedSubscription.stripeSubscriptionId = stripeResult.subscriptionId;
      // await this.subscriptionRepository.save(savedSubscription);
    }

    return this.mapToResponse(savedSubscription);
  }

  async getUserSubscription(userId: string): Promise<SubscriptionResponseDto> {
    let subscription = await this.subscriptionRepository.findOne({
      where: { userId, status: SubscriptionStatus.ACTIVE },
    });

    // If no active subscription found, create a free one
    if (!subscription) {
      subscription = await this.createDefaultSubscription(userId);
    }

    return this.mapToResponse(subscription);
  }

  async updateSubscription(
    userId: string,
    subscriptionUpdateDto: SubscriptionUpdateDto,
  ): Promise<SubscriptionResponseDto> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { userId, status: SubscriptionStatus.ACTIVE },
    });

    if (!subscription) {
      throw new NotFoundException('アクティブなサブスクリプションがありません');
    }

    const { plan, billingCycle, cancellationReason } = subscriptionUpdateDto;

    // Handle plan change
    if (plan && plan !== subscription.plan) {
      const newFeatures = this.getPlanFeatures(plan);
      const newPricing = this.getPlanPricing(plan);

      Object.assign(subscription, {
        plan,
        ...newFeatures,
        monthlyPrice: newPricing.monthlyPrice,
        yearlyPrice: newPricing.yearlyPrice,
        nextBillingDate: this.calculateNextBillingDate(
          billingCycle || subscription.billingCycle,
        ),
      });
    }

    // Handle billing cycle change
    if (billingCycle && billingCycle !== subscription.billingCycle) {
      subscription.billingCycle = billingCycle;
      subscription.nextBillingDate = this.calculateNextBillingDate(billingCycle) || undefined;
    }

    // Handle cancellation
    if (cancellationReason) {
      subscription.status = SubscriptionStatus.CANCELLED;
      subscription.cancelledAt = new Date();
      subscription.cancellationReason = cancellationReason;
    }

    const updatedSubscription = await this.subscriptionRepository.save(subscription);
    return this.mapToResponse(updatedSubscription);
  }

  async cancelSubscription(
    userId: string,
    reason: string,
  ): Promise<SubscriptionResponseDto> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { userId, status: SubscriptionStatus.ACTIVE },
    });

    if (!subscription) {
      throw new NotFoundException('アクティブなサブスクリプションがありません');
    }

    if (subscription.plan === SubscriptionPlan.FREE) {
      throw new BadRequestException('無料プランはキャンセルできません');
    }

    subscription.status = SubscriptionStatus.CANCELLED;
    subscription.cancelledAt = new Date();
    subscription.cancellationReason = reason;

    const cancelledSubscription = await this.subscriptionRepository.save(subscription);
    return this.mapToResponse(cancelledSubscription);
  }

  async trackUsage(
    userId: string,
    type: UsageType,
    quantity: number = 1,
    resource?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { userId, status: SubscriptionStatus.ACTIVE },
    });

    if (!subscription) {
      // Create free subscription if none exists
      await this.createDefaultSubscription(userId);
      return this.trackUsage(userId, type, quantity, resource, metadata);
    }

    // Check usage limits
    await this.checkUsageLimit(subscription, type, quantity);

    // Record usage
    const usage = this.usageRepository.create({
      subscriptionId: subscription.id,
      userId,
      type,
      quantity,
      resource,
      metadata,
      usageDate: new Date(),
    });

    await this.usageRepository.save(usage);

    // Update current usage counters
    await this.updateUsageCounters(subscription, type, quantity);
  }

  async checkUsageLimit(
    subscription: Subscription,
    type: UsageType,
    quantity: number,
  ): Promise<void> {
    switch (type) {
      case UsageType.OPTIMIZATION_REQUEST:
        if (
          subscription.maxOptimizations !== -1 &&
          subscription.currentOptimizations + quantity > subscription.maxOptimizations
        ) {
          throw new ForbiddenException('最適化リクエストの上限に達しました');
        }
        break;
      case UsageType.API_CALL:
        if (
          subscription.maxApiCalls !== -1 &&
          subscription.currentApiCalls + quantity > subscription.maxApiCalls
        ) {
          throw new ForbiddenException('API呼び出しの上限に達しました');
        }
        break;
      case UsageType.ADVANCED_ANALYTICS:
        if (!subscription.hasAdvancedAnalytics) {
          throw new ForbiddenException('高度な分析機能にアクセスできません');
        }
        break;
      case UsageType.AI_RECOMMENDATION:
        if (!subscription.hasAIRecommendations) {
          throw new ForbiddenException('AI推奨機能にアクセスできません');
        }
        break;
    }
  }

  async getUserUsageHistory(
    userId: string,
    page = 1,
    limit = 20,
    type?: UsageType,
  ): Promise<{
    data: SubscriptionUsageResponseDto[];
    pagination: any;
  }> {
    const queryBuilder = this.usageRepository.createQueryBuilder('usage');
    queryBuilder.where('usage.userId = :userId', { userId });

    if (type) {
      queryBuilder.andWhere('usage.type = :type', { type });
    }

    queryBuilder.orderBy('usage.usageDate', 'DESC');

    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data: data.map(this.mapUsageToResponse),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async getAvailablePlans(): Promise<SubscriptionPlanInfoDto[]> {
    return [
      {
        plan: SubscriptionPlan.FREE,
        displayName: 'フリープラン',
        description: '基本的な機能を無料でご利用いただけます',
        monthlyPrice: 0,
        yearlyPrice: 0,
        yearlyDiscount: 0,
        features: this.getPlanFeatures(SubscriptionPlan.FREE),
        isPopular: false,
        isCustom: false,
      },
      {
        plan: SubscriptionPlan.BASIC,
        displayName: 'ベーシックプラン',
        description: 'より多くの最適化と基本的な分析機能',
        monthlyPrice: 2980,
        yearlyPrice: 29800,
        yearlyDiscount: 17,
        features: this.getPlanFeatures(SubscriptionPlan.BASIC),
        isPopular: true,
        isCustom: false,
      },
      {
        plan: SubscriptionPlan.PRO,
        displayName: 'プロフェッショナルプラン',
        description: 'AI推奨機能と高度な分析機能付き',
        monthlyPrice: 9800,
        yearlyPrice: 98000,
        yearlyDiscount: 17,
        features: this.getPlanFeatures(SubscriptionPlan.PRO),
        isPopular: false,
        isCustom: false,
      },
      {
        plan: SubscriptionPlan.ENTERPRISE,
        displayName: 'エンタープライズプラン',
        description: 'すべての機能と優先サポート、ホワイトラベル対応',
        monthlyPrice: 49800,
        yearlyPrice: 498000,
        yearlyDiscount: 17,
        features: this.getPlanFeatures(SubscriptionPlan.ENTERPRISE),
        isPopular: false,
        isCustom: true,
      },
    ];
  }

  private async createDefaultSubscription(userId: string): Promise<Subscription> {
    const planFeatures = this.getPlanFeatures(SubscriptionPlan.FREE);

    const subscription = this.subscriptionRepository.create({
      userId,
      plan: SubscriptionPlan.FREE,
      status: SubscriptionStatus.ACTIVE,
      billingCycle: BillingCycle.MONTHLY,
      monthlyPrice: 0,
      yearlyPrice: 0,
      startDate: new Date(),
      usageResetDate: this.calculateUsageResetDate(),
      ...planFeatures,
      currentOptimizations: 0,
      currentApiCalls: 0,
    });

    return this.subscriptionRepository.save(subscription);
  }

  private getPlanFeatures(plan: SubscriptionPlan) {
    const features = {
      [SubscriptionPlan.FREE]: {
        maxOptimizations: 10,
        maxProducts: 50,
        maxApiCalls: 1000,
        hasAdvancedAnalytics: false,
        hasAIRecommendations: false,
        hasPrioritySupport: false,
        hasWhiteLabel: false,
      },
      [SubscriptionPlan.BASIC]: {
        maxOptimizations: 100,
        maxProducts: 500,
        maxApiCalls: 10000,
        hasAdvancedAnalytics: true,
        hasAIRecommendations: false,
        hasPrioritySupport: false,
        hasWhiteLabel: false,
      },
      [SubscriptionPlan.PRO]: {
        maxOptimizations: 500,
        maxProducts: 2000,
        maxApiCalls: 50000,
        hasAdvancedAnalytics: true,
        hasAIRecommendations: true,
        hasPrioritySupport: true,
        hasWhiteLabel: false,
      },
      [SubscriptionPlan.ENTERPRISE]: {
        maxOptimizations: -1,
        maxProducts: -1,
        maxApiCalls: -1,
        hasAdvancedAnalytics: true,
        hasAIRecommendations: true,
        hasPrioritySupport: true,
        hasWhiteLabel: true,
      },
    };

    return features[plan];
  }

  private getPlanPricing(plan: SubscriptionPlan) {
    const pricing = {
      [SubscriptionPlan.FREE]: { monthlyPrice: 0, yearlyPrice: 0 },
      [SubscriptionPlan.BASIC]: { monthlyPrice: 2980, yearlyPrice: 29800 },
      [SubscriptionPlan.PRO]: { monthlyPrice: 9800, yearlyPrice: 98000 },
      [SubscriptionPlan.ENTERPRISE]: { monthlyPrice: 49800, yearlyPrice: 498000 },
    };

    return pricing[plan];
  }

  private calculateEndDate(billingCycle: BillingCycle): Date | null {
    const now = new Date();
    if (billingCycle === BillingCycle.MONTHLY) {
      return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    } else if (billingCycle === BillingCycle.YEARLY) {
      return new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
    }
    return null; // Lifetime
  }

  private calculateTrialEndDate(): Date {
    const now = new Date();
    return new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days
  }

  private calculateNextBillingDate(billingCycle: BillingCycle): Date | null {
    const now = new Date();
    if (billingCycle === BillingCycle.MONTHLY) {
      return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    } else if (billingCycle === BillingCycle.YEARLY) {
      return new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
    }
    return null; // Lifetime
  }

  private calculateUsageResetDate(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 1); // First day of next month
  }

  private async updateUsageCounters(
    subscription: Subscription,
    type: UsageType,
    quantity: number,
  ): Promise<void> {
    const updates: Partial<Subscription> = {};

    switch (type) {
      case UsageType.OPTIMIZATION_REQUEST:
        updates.currentOptimizations = subscription.currentOptimizations + quantity;
        break;
      case UsageType.API_CALL:
        updates.currentApiCalls = subscription.currentApiCalls + quantity;
        break;
    }

    if (Object.keys(updates).length > 0) {
      await this.subscriptionRepository.update(subscription.id, updates);
    }
  }

  private mapToResponse(subscription: Subscription): SubscriptionResponseDto {
    return {
      id: subscription.id,
      userId: subscription.userId,
      plan: subscription.plan,
      status: subscription.status,
      billingCycle: subscription.billingCycle,
      monthlyPrice: subscription.monthlyPrice ? Number(subscription.monthlyPrice) : undefined,
      yearlyPrice: subscription.yearlyPrice ? Number(subscription.yearlyPrice) : undefined,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      trialEndDate: subscription.trialEndDate,
      nextBillingDate: subscription.nextBillingDate,
      cancelledAt: subscription.cancelledAt,
      cancellationReason: subscription.cancellationReason,
      maxOptimizations: subscription.maxOptimizations,
      maxProducts: subscription.maxProducts,
      maxApiCalls: subscription.maxApiCalls,
      hasAdvancedAnalytics: subscription.hasAdvancedAnalytics,
      hasAIRecommendations: subscription.hasAIRecommendations,
      hasPrioritySupport: subscription.hasPrioritySupport,
      hasWhiteLabel: subscription.hasWhiteLabel,
      currentOptimizations: subscription.currentOptimizations,
      currentApiCalls: subscription.currentApiCalls,
      usageResetDate: subscription.usageResetDate,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
    };
  }

  private mapUsageToResponse(usage: SubscriptionUsage): SubscriptionUsageResponseDto {
    return {
      id: usage.id,
      subscriptionId: usage.subscriptionId,
      userId: usage.userId,
      type: usage.type,
      quantity: usage.quantity,
      usageDate: usage.usageDate,
      resource: usage.resource,
      metadata: usage.metadata,
    };
  }
}