import type { Party, Transaction } from '../../hooks/useLedgerTransactions';

interface LedgerPrintLayoutProps {
  selectedParty: Party;
  printTransactions: Transaction[];
  printTotalCredit: number;
  printTotalDebit: number;
  printFinalBalance: number;
  printFilterType: 'all' | 'date';
  printStartDate: string;
  printEndDate: string;
  printOpeningBalance: number;
}

export const LedgerPrintLayout = ({
  selectedParty,
  printTransactions,
  printTotalCredit,
  printTotalDebit,
  printFinalBalance,
  printFilterType,
  printStartDate,
  printEndDate,
  printOpeningBalance
}: LedgerPrintLayoutProps) => {
  return (
    <div className="hidden print:block bg-white text-black p-4 min-h-screen">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          nav, footer, header, .navbar, .footer {
            display: none !important;
          }
          body {
            background: white !important;
            color: black !important;
            font-family: 'Inter', system-ui, sans-serif !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page {
            size: A4 portrait;
            margin: 1.2cm 1.5cm;
          }
          .print-container {
            max-width: 100% !important;
            width: 100% !important;
          }
          .no-page-break {
            page-break-inside: avoid !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-top: 15px !important;
          }
          th {
            background-color: #f1f5f9 !important;
            color: #0f172a !important;
            border: 1px solid #cbd5e1 !important;
            padding: 10px 12px !important;
            font-size: 10px !important;
            font-weight: 800 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.05em !important;
          }
          td {
            border: 1px solid #e2e8f0 !important;
            padding: 8px 12px !important;
            font-size: 10px !important;
          }
          tr:nth-child(even) {
            background-color: #f8fafc !important;
          }
        }
      `}} />

      {/* Letterhead Header */}
      <div className="border-b-2 border-slate-800 pb-4 mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">ESCROW LEDGER SERVICES</h1>
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Secure Transaction Ledgers & Financial Settlements</p>
        </div>
      </div>

      {/* Statement Info Title */}
      <div className="text-center mb-8">
        <h2 className="text-xl font-extrabold text-slate-900 uppercase tracking-widest border-b border-slate-200 pb-1.5 inline-block px-4">
          Account Statement
        </h2>
        <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-wider">
          {printFilterType === 'all' ? 'Complete History (Start to Finish)' : 'Statement Period Summary'}
        </p>
      </div>

      {/* Party and Statement Metadata Grid */}
      <div className="grid grid-cols-2 gap-6 bg-slate-50 p-5 rounded-2xl border border-slate-100 mb-6 text-sm">
        <div className="space-y-1.5">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Party Details</p>
          <h3 className="text-lg font-black text-slate-900 leading-tight">{selectedParty.party_name}</h3>
          <p className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
            <span className="bg-slate-200 px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-700">SR NO: {selectedParty.sr_no}</span>
            <span className="uppercase font-bold text-blue-600">({selectedParty.status})</span>
            {selectedParty.system_type === 'normal' && <span className="text-slate-400">| Comm Rate: {selectedParty.commission_rate}%</span>}
          </p>
        </div>
        <div className="space-y-1 text-right text-xs text-slate-600 font-medium">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Statement Details</p>
          <p><span className="font-bold text-slate-800">Generated On:</span> {new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
          <p><span className="font-bold text-slate-800">Period:</span> {printFilterType === 'all' ? 'Full History (Start to Finish)' : `${new Date(printStartDate).toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'})} to ${new Date(printEndDate).toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'})}`}</p>
          {printFilterType === 'date' && (
            <p><span className="font-bold text-slate-800">Opening Balance:</span> ₹ {Math.round(Math.abs(printOpeningBalance)).toLocaleString('en-IN')} {printOpeningBalance >= 0 ? 'CR' : 'DR'}</p>
          )}
          <p><span className="font-bold text-slate-800">Records Shown:</span> {printTransactions.length} Entries</p>
        </div>
      </div>

      {/* Financial Summary Box */}
      <div className="grid grid-cols-3 gap-1 bg-slate-50 rounded-2xl border border-slate-200 text-center divide-x divide-slate-200 p-4 mb-6">
        <div className="flex flex-col items-center justify-center">
          <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Total Credit</span>
          <span className="text-base font-black text-emerald-600">₹ {Math.round(printTotalCredit).toLocaleString('en-IN')}</span>
        </div>
        <div className="flex flex-col items-center justify-center">
          <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest mb-1">Total Debit</span>
          <span className="text-base font-black text-rose-600">₹ {Math.round(printTotalDebit).toLocaleString('en-IN')}</span>
        </div>
        <div className="flex flex-col items-center justify-center">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Statement Balance</span>
          <span className={`text-base font-black ${printFinalBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            ₹ {Math.round(Math.abs(printFinalBalance)).toLocaleString('en-IN')} {printFinalBalance >= 0 ? 'CR' : 'DR'}
          </span>
        </div>
      </div>

      {/* Transaction Table */}
      {printTransactions.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl text-slate-400 font-medium">
          No transactions found in full history.
        </div>
      ) : (
        <table className="w-full text-left">
          <thead>
            <tr>
              <th className="w-24 text-center">Date</th>
              <th>Particulars / Remarks</th>
              <th className="w-36 text-right">Credit (₹)</th>
              <th className="w-36 text-right">Debit (₹)</th>
              <th className="w-40 text-right">Balance (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-medium">
            {printFilterType === 'date' && (
              <tr className="no-page-break bg-slate-50/30">
                <td className="text-center text-slate-500 font-mono text-[9px]">
                  {new Date(printStartDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td className="font-black text-slate-500 text-[10px] uppercase tracking-wider">
                  OPENING BALANCE B/F
                </td>
                <td className="text-right text-slate-400 font-bold">-</td>
                <td className="text-right text-slate-400 font-bold">-</td>
                <td className={`text-right font-black ${printOpeningBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  ₹ {Math.round(Math.abs(printOpeningBalance)).toLocaleString('en-IN')} {printOpeningBalance >= 0 ? 'Cr' : 'Dr'}
                </td>
              </tr>
            )}
            {printTransactions.map((t) => (
              <tr key={t.id} className="no-page-break">
                <td className="text-center text-slate-500 font-mono text-[9px]">
                  {new Date(t.transaction_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td>
                  {!t.is_settlement ? (
                    <span className="font-bold text-slate-900 uppercase tracking-tight text-[10px]">
                      {t.partner_party_name || '-'}
                    </span>
                  ) : (
                    <span className="font-extrabold text-blue-700 text-[10px] tracking-wide">
                      MONDAY FINAL SETTLEMENT
                    </span>
                  )}
                  {t.remarks && t.remarks !== 'MONDAY FINAL SETTLEMENT' && (
                    <span className={`ml-2 text-[9px] italic ${t.is_settlement ? 'text-blue-600 font-bold' : 'text-slate-450'}`}>
                      ({t.remarks})
                    </span>
                  )}
                </td>
                <td className="text-right text-emerald-600 font-bold">
                  {!t.is_settlement && t.credit > 0 ? `₹ ${Math.round(t.credit).toLocaleString('en-IN')}` : '-'}
                </td>
                <td className="text-right text-rose-600 font-bold">
                  {!t.is_settlement && t.debit > 0 ? `₹ ${Math.round(t.debit).toLocaleString('en-IN')}` : '-'}
                </td>
                <td className={`text-right font-black ${t.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  ₹ {Math.round(Math.abs(t.balance)).toLocaleString('en-IN')} {t.balance >= 0 ? 'Cr' : 'Dr'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Footer Signature Details */}
      <div className="mt-16 no-page-break flex justify-between items-end px-4 text-xs font-semibold text-slate-500">
        <div>
          <p className="border-t border-slate-300 w-44 text-center pt-1.5 uppercase tracking-wider text-[9px] font-black">Prepared By</p>
        </div>
        <div>
          <p className="border-t border-slate-300 w-44 text-center pt-1.5 uppercase tracking-wider text-[9px] font-black">Authorized Signatory</p>
        </div>
      </div>
    </div>
  );
};
