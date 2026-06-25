import { CircleDashed, Shield, ShieldCheck, BadgeCheck, Crown } from 'lucide-react';
import Badge from './Badge';

export const TRUST_TIERS = [
  { key: 0, label: 'Unverified', tone: 'neutral', icon: CircleDashed },
  { key: 1, label: 'Basic', tone: 'info', icon: Shield },
  { key: 2, label: 'Verified', tone: 'brand', icon: ShieldCheck },
  { key: 3, label: 'Trusted', tone: 'violet', icon: BadgeCheck },
  { key: 4, label: 'Elite', tone: 'success', icon: Crown },
];

// Accepts a numeric tier (0-4) or a string label/status and normalizes it.
export function trustTier(input) {
  if (typeof input === 'number') return TRUST_TIERS[Math.max(0, Math.min(4, input))];
  const s = String(input || '').toLowerCase();
  if (['elite', 'platinum'].some((k) => s.includes(k))) return TRUST_TIERS[4];
  if (['trusted', 'gold', 'verified_plus'].some((k) => s.includes(k))) return TRUST_TIERS[3];
  if (['verified', 'approved', 'active'].some((k) => s.includes(k))) return TRUST_TIERS[2];
  if (['basic', 'pending', 'silver'].some((k) => s.includes(k))) return TRUST_TIERS[1];
  return TRUST_TIERS[0];
}

export default function TrustTier({ tier, size = 'md', variant = 'soft', className }) {
  const t = trustTier(tier);
  const Icon = t.icon;
  return (
    <Badge tone={t.tone} variant={variant} size={size} icon={<Icon />} className={className}>
      {t.label}
    </Badge>
  );
}
