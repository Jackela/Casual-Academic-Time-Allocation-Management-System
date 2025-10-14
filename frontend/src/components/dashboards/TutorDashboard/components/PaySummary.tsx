import { memo } from 'react';
import { Card, CardContent, CardTitle } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { useCurrencyFormatter } from '../../../../lib/config/ui-config';
import { messages } from '../../../../i18n/messages';
import { formatters } from '../../../../utils/formatting';

export interface PaySummaryProps {
  totalEarned: number;
  thisWeekPay: number;
  averagePerTimesheet: number;
  paymentStatus: Record<string, number>;
  className?: string;
}

const PaySummary = memo<PaySummaryProps>(({ totalEarned, thisWeekPay, averagePerTimesheet, paymentStatus, className = '' }) => {
  const formatCurrency = useCurrencyFormatter();
  const totalEarningsLabel = messages.tutorDashboard.totalEarnings;

  const totalEarnedText = formatCurrency(totalEarned);
  const averageText = formatCurrency(averagePerTimesheet);
  const thisWeekText = formatCurrency(thisWeekPay, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  const nextPaymentDate = formatters.date('2024-01-31');
  const cardClassName = ['p-4', className].filter(Boolean).join(' ');

  return (
    <Card className={cardClassName}>
      <CardTitle className="mb-2 text-lg font-semibold">Pay Summary</CardTitle>
      <CardContent className="space-y-2 p-0">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{totalEarningsLabel}:</span>
          <strong className="text-foreground">{totalEarnedText}</strong>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">This Week:</span>
          <strong className="text-foreground">{thisWeekText}</strong>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Average per Timesheet:</span>
          <strong className="text-foreground">{averageText}</strong>
        </div>

        <div className="pt-4">
          <h4 className="mb-2 font-semibold">Payment Status</h4>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>{paymentStatus.FINAL_CONFIRMED || 0} Final Confirmed</p>
            <p>{paymentStatus.LECTURER_CONFIRMED || 0} Awaiting Final Approval</p>
            <p className="font-medium text-primary">Next Payment Date: {nextPaymentDate}</p>
          </div>
        </div>

        <div className="pt-4">
          <h4 className="mb-2 font-semibold">Tax Information</h4>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>Year-to-Date Earnings: {totalEarnedText}</p>
            <Button variant="outline" size="sm" className="mt-2 w-full">Download Tax Summary</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

PaySummary.displayName = 'PaySummary';

export default PaySummary;
