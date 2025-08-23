'use client';

import { Fragment } from 'react';
import { XMarkIcon, ShoppingBagIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, LoadingSpinner } from '@/components/ui';
import { CartItem } from './CartItem';
import { CartSummary } from './CartSummary';
import { useCart } from '@/hooks/useCart';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { data: cart, isLoading, error } = useCart();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-secondary-200">
              <h2 className="text-lg font-semibold text-secondary-900 flex items-center">
                <ShoppingBagIcon className="h-5 w-5 mr-2" />
                Shopping Cart
                {cart && cart.items.length > 0 && (
                  <span className="ml-2 bg-primary-100 text-primary-800 text-sm px-2 py-0.5 rounded-full">
                    {cart.items.reduce((total, item) => total + item.quantity, 0)}
                  </span>
                )}
              </h2>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <XMarkIcon className="h-5 w-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {isLoading && (
                <div className="flex-1 flex items-center justify-center">
                  <LoadingSpinner size="lg" />
                </div>
              )}

              {error && (
                <div className="flex-1 flex items-center justify-center p-4">
                  <div className="text-center">
                    <div className="text-red-500 mb-2">
                      <ShoppingBagIcon className="h-12 w-12 mx-auto" />
                    </div>
                    <h3 className="text-lg font-medium text-secondary-900 mb-1">
                      Unable to load cart
                    </h3>
                    <p className="text-secondary-500 text-sm">
                      Please check your connection and try again.
                    </p>
                  </div>
                </div>
              )}

              {cart && cart.items.length === 0 && (
                <div className="flex-1 flex items-center justify-center p-4">
                  <div className="text-center">
                    <ShoppingBagIcon className="h-16 w-16 text-secondary-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-secondary-900 mb-1">
                      Your cart is empty
                    </h3>
                    <p className="text-secondary-500 text-sm mb-4">
                      Add some products to get started
                    </p>
                    <Button onClick={onClose}>
                      Continue Shopping
                    </Button>
                  </div>
                </div>
              )}

              {cart && cart.items.length > 0 && (
                <>
                  {/* Cart Items */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {cart.items.map((item) => (
                      <CartItem key={item.id} item={item} />
                    ))}
                  </div>

                  {/* Summary */}
                  <div className="border-t border-secondary-200 p-4">
                    <CartSummary cart={cart} />
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}