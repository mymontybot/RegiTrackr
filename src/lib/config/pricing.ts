export const PRICING = {
  floor: 199,

  tiers: [
    {
      id: 'starter',
      name: 'Starter',
      minClients: 1,
      maxClients: 10,
      pricePerClient: 59,
      foundingPricePerClient: 39,
    },
    {
      id: 'growth',
      name: 'Growth',
      minClients: 11,
      maxClients: 50,
      pricePerClient: 45,
      foundingPricePerClient: 29,
    },
    {
      id: 'pro',
      name: 'Pro',
      minClients: 51,
      maxClients: 100,
      pricePerClient: 29,
      foundingPricePerClient: 19,
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      minClients: 101,
      maxClients: Infinity,
      pricePerClient: 25,
      foundingPricePerClient: 25,
      platformFee: 500,
    },
  ],

  foundingMemberCap: 25,
  foundingMemberNote: 'Founding member rate, locked for life while subscription is active.',
} as const

export type TierId = 'starter' | 'growth' | 'pro' | 'enterprise'

// Annual billing
export const ANNUAL_DISCOUNT = 0.20
export const ANNUAL_DISCOUNT_LABEL = '20% off'
export const ANNUAL_MONTHS_EQUIVALENT = 9.6
export const ANNUAL_SAVINGS_LABEL = 'Save 2.4 months per year'

export type BillingCycle = 'monthly' | 'annual'

export interface PricingResult {
  tier: typeof PRICING.tiers[number]
  clients: number
  pricePerClient: number
  subtotal: number
  monthly: number
  billingCycle: BillingCycle
  annualTotal: number
  annualSavings: number
  floorApplied: boolean
  platformFee: number
  isEnterprise: boolean
}

export function calculatePrice(
  clients: number,
  isFoundingMember = false,
  billingCycle: BillingCycle = 'monthly'
): PricingResult {
  const tier =
    PRICING.tiers.find(
      t => clients >= t.minClients && clients <= t.maxClients
    ) ??
    PRICING.tiers[PRICING.tiers.length - 1]

  const basePrice = isFoundingMember
    ? tier.foundingPricePerClient
    : tier.pricePerClient

  const pricePerClient =
    billingCycle === 'annual'
      ? Math.round(basePrice * (1 - ANNUAL_DISCOUNT) * 100) / 100
      : basePrice

  const platformFee = 'platformFee' in tier ? tier.platformFee : 0

  const platformFeeDiscounted =
    billingCycle === 'annual'
      ? Math.round(platformFee * (1 - ANNUAL_DISCOUNT))
      : platformFee

  const subtotal = clients * pricePerClient + platformFeeDiscounted
  const monthly = Math.max(subtotal, PRICING.floor)
  const floorApplied = subtotal < PRICING.floor

  const monthlyNoDiscount = Math.max(
    clients * basePrice + platformFee,
    PRICING.floor
  )
  const annualTotal = billingCycle === 'annual' ? monthly * 12 : 0
  const annualSavings =
    billingCycle === 'annual' ? monthlyNoDiscount * 12 - annualTotal : 0

  return {
    tier,
    clients,
    pricePerClient,
    subtotal,
    monthly,
    billingCycle,
    annualTotal,
    annualSavings,
    floorApplied,
    platformFee: platformFeeDiscounted,
    isEnterprise: tier.id === 'enterprise',
  }
}
