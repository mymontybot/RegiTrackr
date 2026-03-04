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

export interface PricingResult {
  tier: typeof PRICING.tiers[number]
  clients: number
  pricePerClient: number
  subtotal: number
  monthly: number
  floorApplied: boolean
  platformFee: number
  isEnterprise: boolean
}

export function calculatePrice(
  clients: number,
  isFoundingMember = false
): PricingResult {
  const tier =
    PRICING.tiers.find(t => clients >= t.minClients && clients <= t.maxClients) ??
    PRICING.tiers[PRICING.tiers.length - 1]

  const pricePerClient = isFoundingMember
    ? tier.foundingPricePerClient
    : tier.pricePerClient

  const platformFee = 'platformFee' in tier ? tier.platformFee : 0
  const subtotal = clients * pricePerClient + platformFee
  const monthly = Math.max(subtotal, PRICING.floor)
  const floorApplied = subtotal < PRICING.floor

  return {
    tier,
    clients,
    pricePerClient,
    subtotal,
    monthly,
    floorApplied,
    platformFee,
    isEnterprise: tier.id === 'enterprise',
  }
}
