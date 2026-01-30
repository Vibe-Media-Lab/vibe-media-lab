'use client'

import { CreditCard, Check, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    features: ['100 credits/month', 'Standard quality', 'Community support'],
    current: true,
  },
  {
    name: 'Pro',
    price: '$19',
    period: '/month',
    features: [
      '1,000 credits/month',
      'HD quality',
      'Priority support',
      'Private generations',
      'API access',
    ],
    recommended: true,
  },
  {
    name: 'Ultimate',
    price: '$49',
    period: '/month',
    features: [
      'Unlimited credits',
      '4K quality',
      '24/7 support',
      'Private generations',
      'API access',
      'Custom models',
    ],
  },
]

export default function SubscriptionPage() {
  // Mock data
  const currentCredits = 68
  const totalCredits = 100

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-8 py-8">
      {/* Current Usage */}
      <div className="rounded-2xl border border-white/10 bg-[#1a1a1a] p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-neon-green)]/20">
            <Zap className="h-5 w-5 text-[var(--color-neon-green)]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Current Usage</h2>
            <p className="text-sm text-white/60">
              {currentCredits} of {totalCredits} credits remaining this month
            </p>
          </div>
        </div>
        <Progress value={currentCredits} max={totalCredits} className="h-3" />
      </div>

      {/* Plans */}
      <div className="rounded-2xl border border-white/10 bg-[#1a1a1a] p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-neon-purple)]/20">
            <CreditCard className="h-5 w-5 text-[var(--color-neon-purple)]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Subscription Plans</h2>
            <p className="text-sm text-white/60">
              Choose the plan that works best for you
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-xl border p-5 ${
                plan.recommended
                  ? 'border-[var(--color-neon-pink)] bg-[var(--color-neon-pink)]/5'
                  : 'border-white/10 bg-white/5'
              }`}
            >
              {plan.recommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--color-neon-pink)] px-3 py-1 text-xs font-medium text-white">
                  Recommended
                </div>
              )}
              {plan.current && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white">
                  Current
                </div>
              )}

              <h3 className="mt-2 text-lg font-semibold text-white">{plan.name}</h3>
              <div className="mt-2">
                <span className="text-3xl font-bold text-white">{plan.price}</span>
                <span className="text-white/60">{plan.period}</span>
              </div>

              <ul className="mt-4 space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-white/80">
                    <Check className="h-4 w-4 text-[var(--color-neon-green)]" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                className={`mt-4 w-full ${
                  plan.current
                    ? 'bg-white/10 text-white hover:bg-white/20'
                    : plan.recommended
                    ? 'bg-[var(--color-neon-pink)] text-white hover:bg-[var(--color-neon-pink)]/90'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
                disabled={plan.current}
              >
                {plan.current ? 'Current Plan' : 'Upgrade'}
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Billing History */}
      <div className="rounded-2xl border border-white/10 bg-[#1a1a1a] p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">Billing History</h3>
        <p className="text-sm text-white/60">
          No billing history yet.
        </p>
      </div>
    </div>
  )
}
