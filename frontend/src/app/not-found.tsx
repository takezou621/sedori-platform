import Link from 'next/link';
import { Button } from '@/components/ui';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto w-24 h-24 bg-secondary-100 rounded-full flex items-center justify-center mb-8">
          <svg
            className="w-12 h-12 text-secondary-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.462-1.01-5.93-2.617C5.68 11.782 5.318 11.17 5 10.5a7.965 7.965 0 017-4c2.205 0 4.2.898 5.643 2.357.23.232.447.48.647.743"
            />
          </svg>
        </div>
        
        <h1 className="text-6xl font-bold text-secondary-900 mb-2">404</h1>
        
        <h2 className="text-xl font-semibold text-secondary-700 mb-4">
          ページが見つかりません
        </h2>
        
        <p className="text-secondary-600 mb-8 leading-relaxed">
          お探しのページは存在しないか、移動した可能性があります。
          URLをもう一度ご確認いただくか、ホームページからお探しください。
        </p>
        
        <div className="space-y-4">
          <Link href="/">
            <Button size="lg" className="w-full sm:w-auto">
              ホームに戻る
            </Button>
          </Link>
          
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Link href="/products">
              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                商品を見る
              </Button>
            </Link>
            
            <Link href="/dashboard">
              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                ダッシュボード
              </Button>
            </Link>
          </div>
        </div>
        
        <div className="mt-12 p-4 bg-secondary-50 rounded-lg border border-secondary-200">
          <p className="text-sm text-secondary-600">
            <strong>ヒント:</strong> せどりプラットフォームでは商品分析、利益計算、在庫管理など
            ビジネス成長に必要な機能をご利用いただけます。
          </p>
        </div>
      </div>
    </div>
  );
}