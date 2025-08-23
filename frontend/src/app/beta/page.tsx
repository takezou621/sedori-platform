'use client';

import { useState } from 'react';
import { Card, Button, Input, Badge } from '@/components/ui';

interface BetaFormData {
  email: string;
  name: string;
  company: string;
  businessType: string;
  currentTools: string;
  expectations: string;
}

export default function BetaPage() {
  const [formData, setFormData] = useState<BetaFormData>({
    email: '',
    name: '',
    company: '',
    businessType: '',
    currentTools: '',
    expectations: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleInputChange = (field: keyof BetaFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/v1/beta/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSubmitted(true);
      } else {
        alert('申込みに失敗しました。再度お試しください。');
      }
    } catch (error) {
      alert('申込みに失敗しました。再度お試しください。');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-16">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              ベータ申込み完了！
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              ご申込みありがとうございます。<br />
              選考結果は1週間以内にメールでお知らせいたします。
            </p>
            <Button onClick={() => window.location.href = '/'}>
              ホームに戻る
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-16">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge variant="default" className="mb-4">
            🎉 ベータ版限定募集中
          </Badge>
          <h1 className="text-4xl font-bold text-gray-900 mb-6">
            Sedori Platform ベータテスト参加者募集
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            次世代せどり・転売プラットフォームのベータテストに参加して、
            いち早く新機能を体験しませんか？
          </p>
        </div>

        {/* Benefits */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <Card className="p-6 text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">早期アクセス</h3>
            <p className="text-gray-600">
              正式リリース前に最新機能を無料で体験できます
            </p>
          </Card>

          <Card className="p-6 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a2 2 0 01-2-2v-6a2 2 0 012-2h2V4a2 2 0 012-2h4a2 2 0 012 2v4z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">開発チームとの直接対話</h3>
            <p className="text-gray-600">
              フィードバックが直接開発に反映されます
            </p>
          </Card>

          <Card className="p-6 text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">特別価格での正式利用権</h3>
            <p className="text-gray-600">
              正式版リリース後も特別価格で継続利用可能
            </p>
          </Card>
        </div>

        {/* Application Form */}
        <Card className="p-8">
          <h2 className="text-2xl font-bold mb-6">ベータテスト申込フォーム</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  お名前 *
                </label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="山田太郎"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  メールアドレス *
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="example@email.com"
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  会社・屋号名
                </label>
                <Input
                  type="text"
                  value={formData.company}
                  onChange={(e) => handleInputChange('company', e.target.value)}
                  placeholder="株式会社○○ または 個人事業主"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  事業形態
                </label>
                <Input
                  type="text"
                  value={formData.businessType}
                  onChange={(e) => handleInputChange('businessType', e.target.value)}
                  placeholder="せどり・転売、EC事業、小売業など"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                現在使用中のツール・サービス
              </label>
              <textarea
                value={formData.currentTools}
                onChange={(e) => handleInputChange('currentTools', e.target.value)}
                className="w-full h-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Amazonセラーセントラル、楽天市場、独自EC、在庫管理ツールなど"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sedori Platformに期待すること
              </label>
              <textarea
                value={formData.expectations}
                onChange={(e) => handleInputChange('expectations', e.target.value)}
                className="w-full h-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="業務効率化、売上向上、在庫管理の最適化など、具体的なご要望をお聞かせください"
              />
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>注意事項：</strong>
                ベータテストは限定100名様での実施予定です。
                申込み多数の場合は選考させていただきます。
                選考結果は1週間以内にメールでお知らせいたします。
              </p>
            </div>

            <div className="text-center">
              <Button
                type="submit"
                size="lg"
                disabled={loading || !formData.email || !formData.name}
                className="px-12"
              >
                {loading ? '申込み中...' : 'ベータテストに申し込む'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}