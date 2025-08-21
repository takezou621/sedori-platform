export function Footer() {
  return (
    <footer className="bg-secondary-50 border-t border-secondary-200">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-lg font-semibold text-secondary-900 mb-4">
              Sedori Platform
            </h3>
            <p className="text-secondary-600 mb-4">
              Your comprehensive platform for product sourcing, sales tracking, and business intelligence.
            </p>
            <div className="flex space-x-4">
              {/* Social links would go here */}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold text-secondary-900 uppercase tracking-wider mb-4">
              Quick Links
            </h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-secondary-600 hover:text-primary-600 transition-colors">
                  Dashboard
                </a>
              </li>
              <li>
                <a href="#" className="text-secondary-600 hover:text-primary-600 transition-colors">
                  Products
                </a>
              </li>
              <li>
                <a href="#" className="text-secondary-600 hover:text-primary-600 transition-colors">
                  Sales
                </a>
              </li>
              <li>
                <a href="#" className="text-secondary-600 hover:text-primary-600 transition-colors">
                  Analytics
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-sm font-semibold text-secondary-900 uppercase tracking-wider mb-4">
              Support
            </h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-secondary-600 hover:text-primary-600 transition-colors">
                  Help Center
                </a>
              </li>
              <li>
                <a href="#" className="text-secondary-600 hover:text-primary-600 transition-colors">
                  Contact Us
                </a>
              </li>
              <li>
                <a href="#" className="text-secondary-600 hover:text-primary-600 transition-colors">
                  Documentation
                </a>
              </li>
              <li>
                <a href="#" className="text-secondary-600 hover:text-primary-600 transition-colors">
                  API Reference
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom section */}
        <div className="mt-8 pt-8 border-t border-secondary-200">
          <p className="text-center text-secondary-600 text-sm">
            © {new Date().getFullYear()} Sedori Platform. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}