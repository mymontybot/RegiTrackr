export const metadata = {
  title: "Pricing — RegiTrackr",
  description:
    "Simple per-client pricing starting at $59/client/month. Monthly minimum $199. No long-term contract.",
  alternates: { canonical: "https://regitrackr.com/pricing" },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
