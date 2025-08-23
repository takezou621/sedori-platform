import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ComplianceService } from '../services/compliance.service';
import { CreateAntiqueLicenseDto } from '../dto/create-antique-license.dto';
import { UpdateAntiqueLicenseDto } from '../dto/update-antique-license.dto';
import { ComplianceCheckRequestDto } from '../dto/compliance-check-request.dto';
import { ComplianceStatus } from '../entities/compliance-check.entity';
import { ProductComplianceChecker } from '../checkers/product-compliance.checker';
import { AntiqueDealerRules } from '../rules/antique-dealer.rules';

@ApiTags('Compliance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('compliance')
export class ComplianceController {
  constructor(
    private readonly complianceService: ComplianceService,
    private readonly complianceChecker: ProductComplianceChecker,
    private readonly antiqueDealerRules: AntiqueDealerRules,
  ) {}

  // Dashboard
  @Get('dashboard')
  @ApiOperation({ summary: 'Get compliance dashboard' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard data retrieved successfully',
  })
  async getDashboard(@Req() req: any) {
    const userId = req.user.sub;
    return this.complianceService.getComplianceDashboard(userId);
  }

  // License Management
  @Post('licenses')
  @ApiOperation({ summary: 'Create antique dealer license' })
  @ApiResponse({ status: 201, description: 'License created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async createLicense(
    @Req() req: any,
    @Body() createLicenseDto: CreateAntiqueLicenseDto,
  ) {
    const userId = req.user.sub;
    return this.complianceService.createAntiqueLicense(
      userId,
      createLicenseDto,
    );
  }

  @Get('licenses')
  @ApiOperation({ summary: 'Get user licenses' })
  @ApiResponse({ status: 200, description: 'Licenses retrieved successfully' })
  async getLicenses(@Req() req: any) {
    const userId = req.user.sub;
    return this.complianceService.getUserLicenses(userId);
  }

  @Get('licenses/:id')
  @ApiOperation({ summary: 'Get license by ID' })
  @ApiResponse({ status: 200, description: 'License found' })
  @ApiResponse({ status: 404, description: 'License not found' })
  async getLicense(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.sub;
    return this.complianceService.getLicenseById(id, userId);
  }

  @Patch('licenses/:id')
  @ApiOperation({ summary: 'Update license' })
  @ApiResponse({ status: 200, description: 'License updated successfully' })
  @ApiResponse({ status: 404, description: 'License not found' })
  async updateLicense(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateLicenseDto: UpdateAntiqueLicenseDto,
  ) {
    const userId = req.user.sub;
    return this.complianceService.updateAntiqueLicense(
      id,
      userId,
      updateLicenseDto,
    );
  }

  @Delete('licenses/:id')
  @ApiOperation({ summary: 'Delete license' })
  @ApiResponse({ status: 204, description: 'License deleted successfully' })
  @ApiResponse({ status: 404, description: 'License not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteLicense(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.sub;
    await this.complianceService.deleteAntiqueLicense(id, userId);
  }

  // Product Compliance Checking
  @Post('products/check')
  @ApiOperation({ summary: 'Perform product compliance check' })
  @ApiResponse({ status: 201, description: 'Compliance check completed' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async checkProduct(
    @Req() req: any,
    @Body() checkRequest: ComplianceCheckRequestDto,
  ) {
    const userId = req.user.sub;
    return this.complianceService.performProductComplianceCheck(
      userId,
      checkRequest,
    );
  }

  @Post('products/check-multiple')
  @ApiOperation({ summary: 'Perform compliance check on multiple products' })
  @ApiResponse({ status: 201, description: 'Compliance checks completed' })
  async checkMultipleProducts(
    @Req() req: any,
    @Body() data: { productIds: string[]; originCountry?: string },
  ) {
    const userId = req.user.sub;
    return this.complianceService.checkMultipleProducts(
      userId,
      data.productIds,
      data.originCountry,
    );
  }

  @Get('products/:productId/status')
  @ApiOperation({ summary: 'Get product compliance status' })
  @ApiResponse({ status: 200, description: 'Compliance status retrieved' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getProductStatus(@Param('productId') productId: string) {
    const status =
      await this.complianceService.getProductComplianceStatus(productId);
    return { status };
  }

  @Get('products/:productId/latest-check')
  @ApiOperation({ summary: 'Get latest compliance check for product' })
  @ApiResponse({ status: 200, description: 'Latest check retrieved' })
  async getLatestCheck(@Param('productId') productId: string) {
    return this.complianceChecker.getLatestCheck(productId);
  }

  // Compliance Checks History
  @Get('checks')
  @ApiOperation({ summary: 'Get user compliance checks' })
  @ApiQuery({ name: 'status', required: false, enum: ComplianceStatus })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Compliance checks retrieved' })
  async getChecks(
    @Req() req: any,
    @Query('status') status?: ComplianceStatus,
    @Query('limit') limit?: string,
  ) {
    const userId = req.user.sub;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.complianceService.getUserComplianceChecks(
      userId,
      status,
      limitNum,
    );
  }

  @Get('checks/:id')
  @ApiOperation({ summary: 'Get compliance check by ID' })
  @ApiResponse({ status: 200, description: 'Compliance check found' })
  @ApiResponse({ status: 404, description: 'Check not found' })
  async getCheck(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.sub;
    return this.complianceService.getComplianceCheckById(id, userId);
  }

  // Regulation Rules
  @Get('rules')
  @ApiOperation({ summary: 'Get regulation rules' })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Regulation rules retrieved' })
  async getRules(
    @Query('category') category?: string,
    @Query('type') type?: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 100;
    return this.complianceService.getRegulationRules(category, type, limitNum);
  }

  @Get('rules/search')
  @ApiOperation({ summary: 'Search regulation rules' })
  @ApiQuery({ name: 'q', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Search results retrieved' })
  async searchRules(@Query('q') searchTerm: string) {
    return this.complianceService.searchRegulationRules(searchTerm);
  }

  // Reports
  @Get('reports/compliance')
  @ApiOperation({ summary: 'Generate compliance report' })
  @ApiQuery({ name: 'dateFrom', required: true, type: String })
  @ApiQuery({ name: 'dateTo', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Compliance report generated' })
  async generateReport(
    @Req() req: any,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) {
    const userId = req.user.sub;
    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);

    return this.complianceService.generateComplianceReport(
      userId,
      fromDate,
      toDate,
    );
  }

  // Reference Data
  @Get('reference/antique-categories')
  @ApiOperation({ summary: 'Get antique dealer categories' })
  @ApiResponse({ status: 200, description: 'Categories retrieved' })
  async getAntiqueCategories() {
    const categories = this.antiqueDealerRules.getAllCategories();
    return categories.map((category) => ({
      value: category,
      label: this.antiqueDealerRules.getCategoryDisplayName(category),
    }));
  }

  @Get('reference/compliance-statuses')
  @ApiOperation({ summary: 'Get compliance status options' })
  @ApiResponse({ status: 200, description: 'Statuses retrieved' })
  async getComplianceStatuses() {
    return Object.values(ComplianceStatus).map((status) => ({
      value: status,
      label: this.getStatusDisplayName(status),
    }));
  }

  // Health Check
  @Get('health')
  @ApiOperation({ summary: 'Compliance system health check' })
  @ApiResponse({ status: 200, description: 'System health status' })
  async healthCheck() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        compliance: 'operational',
        database: 'operational',
        rules: 'operational',
      },
    };
  }

  private getStatusDisplayName(status: ComplianceStatus): string {
    const displayNames: Record<ComplianceStatus, string> = {
      [ComplianceStatus.COMPLIANT]: '適合',
      [ComplianceStatus.NON_COMPLIANT]: '非適合',
      [ComplianceStatus.REQUIRES_REVIEW]: '要確認',
      [ComplianceStatus.PENDING]: '保留中',
      [ComplianceStatus.NEEDS_LICENSE]: '許可証必要',
      [ComplianceStatus.PROHIBITED]: '禁止',
    };

    return displayNames[status];
  }
}
