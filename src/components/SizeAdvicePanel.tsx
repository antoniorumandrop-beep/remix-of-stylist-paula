import { useState } from 'react';
import { Ruler } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useLanguage } from '@/i18n/LanguageContext';
import { pointKey } from '@/lib/fit/copy';
import { SIZE_TABLE, recommendSize } from '@/lib/fit/size';
import type { MeasuredProfile } from '@/lib/profile';
import type { Product } from '@/lib/catalog/types';

/**
 * The question the product page never answered.
 *
 * Fit Score says where a garment will pull. It does not say what to order, and
 * that is the thing a woman is actually deciding — 42% of returns in the study
 * behind this product are the wrong size.
 *
 * The answer is deliberately not a single label. 90.84% of the women in that
 * same study take different sizes in different parts of the body, so a lone
 * "M" is wrong for nine in ten of them. This shows the size each measurement
 * takes, the one to order, and what that costs in centimetres.
 */
/** The body part has to be inflected, so each one gets its own sentence. */
const ROOM_KEY = {
  bust: 'sizeRoomBust',
  waist: 'sizeRoomWaist',
  hips: 'sizeRoomHips',
} as const;

/**
 * The other direction, which brand charts made real.
 *
 * The generic table runs to size 50, so something always fitted and a shortfall
 * never came up. A shop's own chart stops where the shop stops grading —
 * Reserved's largest dress size is a 90 cm waist — and recommending it in
 * silence to someone who measures more is how a garment gets ordered, not
 * closed, and returned.
 */
const SHORT_KEY = {
  bust: 'sizeShortBust',
  waist: 'sizeShortWaist',
  hips: 'sizeShortHips',
} as const;

export function SizeAdvicePanel({
  product,
  profile,
}: {
  product: Product;
  profile: MeasuredProfile;
}) {
  const { t } = useLanguage();
  const [chartOpen, setChartOpen] = useState(false);

  const advice = recommendSize(profile, product.category, product.sizes, product.sizeChart);
  if (!advice) return null;

  const label = (point: string) => t(pointKey(point as 'bust' | 'waist' | 'hips'));

  /**
   * The chart actually used, because the link says "the chart Paula reads".
   * Showing the generic table under advice taken from the brand's own would be
   * the one thing this panel exists to avoid.
   */
  const chartRows = advice.fromBrandChart && product.sizeChart
    ? product.sizeChart.map(row => ({ label: row.size, bust: row.bust, waist: row.waist, hips: row.hips }))
    : SIZE_TABLE.map(row => ({
        label: `${row.size} (${row.letter})`,
        bust: row.bust,
        waist: row.waist,
        hips: row.hips,
      }));
  const room = advice.points.filter(p => p.slackCm > 1);
  const short = advice.points.filter(p => p.slackCm < -1);

  return (
    <div className="bg-card rounded-xl p-5 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <Ruler className="w-4 h-4" />
        <span className="text-sm font-medium">{t('sizeTitle')}</span>
      </div>

      <p className="font-display text-2xl">
        {advice.fromBrandChart ? t('sizeOneBrand', advice.label) : t('sizeOne', advice.size, advice.letter)}
      </p>

      {advice.split && (
        <>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{t('sizeSplitLead')}</p>
          <ul className="mt-3 space-y-1">
            {advice.points.map(p => (
              <li key={p.point} className="text-sm flex items-center justify-between gap-4">
                <span className="text-muted-foreground">{label(p.point)}</span>
                <span>{advice.fromBrandChart ? p.letter : `${p.size} (${p.letter})`}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{t('sizeWhyLargest')}</p>
        </>
      )}

      {(room.length > 0 || short.length > 0) && (
        <ul className="mt-3 space-y-1">
          {short.map(p => (
            <li key={p.point} className="text-sm">
              {t(SHORT_KEY[p.point], Math.abs(p.slackCm))}
            </li>
          ))}
          {room.map(p => (
            <li key={p.point} className="text-sm text-muted-foreground">
              {t(ROOM_KEY[p.point], p.slackCm)}
            </li>
          ))}
        </ul>
      )}

      {advice.offered && (
        <p className="text-xs text-muted-foreground mt-3">
          {advice.available === false && <span className="text-foreground">{t('sizeNotOffered')} </span>}
          {t('sizeOfferedList', advice.offered.join(', '))}
        </p>
      )}

      {/* Which table this came from is the whole difference between "a brand
          cuts differently, check theirs" and "this is theirs". */}
      <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
        {advice.fromBrandChart ? t('sizeFromBrandChart', product.brand) : t('sizeCaveat')}
      </p>
      <button
        onClick={() => setChartOpen(true)}
        className="mt-2 text-xs font-medium underline underline-offset-4"
      >
        {t('sizeChartLink')}
      </button>

      <Dialog open={chartOpen} onOpenChange={setChartOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">{t('sizeChartTitle')}</DialogTitle>
            <DialogDescription className="text-xs leading-relaxed">
              {advice.fromBrandChart ? t('sizeChartIntroBrand', product.brand) : t('sizeChartIntro')}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-x-auto -mx-1 px-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-widest text-muted-foreground">
                  <th className="py-2 pr-3 font-normal">{t('sizeColSize')}</th>
                  <th className="py-2 pr-3 font-normal">{t('sizeColBust')}</th>
                  <th className="py-2 pr-3 font-normal">{t('sizeColWaist')}</th>
                  <th className="py-2 font-normal">{t('sizeColHips')}</th>
                </tr>
              </thead>
              <tbody>
                {chartRows.map(row => (
                  <tr
                    key={row.label}
                    className={row.label === advice.label ? 'font-medium' : 'text-muted-foreground'}
                  >
                    <td className="py-1.5 pr-3">{row.label}</td>
                    <td className="py-1.5 pr-3">{row.bust ?? '—'}</td>
                    <td className="py-1.5 pr-3">{row.waist ?? '—'}</td>
                    <td className="py-1.5">{row.hips ?? '—'}</td>
                  </tr>
                ))}
                {/* Her own three numbers on the same axis as the chart, so the
                    comparison the recommendation makes is visible, not implied. */}
                <tr className="border-t border-border">
                  <td className="py-2 pr-3 text-xs uppercase tracking-widest text-muted-foreground">
                    {t('sizeYours')}
                  </td>
                  <td className="py-2 pr-3">{profile.bust}</td>
                  <td className="py-2 pr-3">{profile.waist}</td>
                  <td className="py-2">{profile.hips}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
