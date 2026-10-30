import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, Share2, FileText, Check, AlertCircle, Loader2 } from 'lucide-react';

const ViewStatement: React.FC = () => {
  const [searchParams] = useSearchParams();
  const rawImg = searchParams.get('img') || searchParams.get('p') || '';
  const imageUrl = rawImg.startsWith('http')
    ? rawImg
    : (rawImg ? `https://nivmzcshpgftlbjdmvtk.supabase.co/storage/v1/object/public/statements/${rawImg}` : '');
  const partyName = searchParams.get('party') || 'Client';
  const companyName = searchParams.get('company') || 'LOFFERS DTF';

  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [shared, setShared] = useState(false);

  const cleanFileName = `${companyName.replace(/[^a-zA-Z0-9]/g, '_')}_Statement_${partyName.replace(/[^a-zA-Z0-9]/g, '_')}.png`;

  const handleDownload = async () => {
    if (!imageUrl) return;
    setDownloading(true);
    setDownloadSuccess(false);

    try {
      // 1. Fetch image as blob
      const res = await fetch(imageUrl, { mode: 'cors' });
      if (!res.ok) throw new Error('Failed to fetch image');
      const blob = await res.blob();

      // 2. Trigger browser download
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = cleanFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      console.warn('Direct blob download failed, falling back to window.open:', err);
      // Fallback for strict browser security policies
      window.open(imageUrl, '_blank');
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${companyName} - Account Statement (${partyName})`,
          text: `Account Statement for ${partyName} from ${companyName}`,
          url: window.location.href
        });
        setShared(true);
        setTimeout(() => setShared(false), 3000);
      } catch (e) {
        console.warn('Share cancelled or failed:', e);
      }
    } else {
      // Copy link to clipboard fallback
      try {
        await navigator.clipboard.writeText(window.location.href);
        setShared(true);
        setTimeout(() => setShared(false), 3000);
      } catch (e) {
        console.warn('Clipboard write failed:', e);
      }
    }
  };

  if (!imageUrl) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-black text-slate-900">Statement Not Found</h2>
          <p className="text-sm text-slate-600">
            No image link was provided. Please check the link or request a new statement.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans pb-28">
      {/* Top Header Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-black uppercase tracking-tight text-slate-900 truncate">
                {companyName}
              </h1>
              <p className="text-[11px] font-bold text-slate-500 truncate">
                Bill Statement for: <span className="text-emerald-700">{partyName}</span>
              </p>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleShare}
              className="p-2.5 sm:px-3 sm:py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 active:scale-95"
              title="Share statement link"
            >
              {shared ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4 text-slate-600" />}
              <span className="hidden sm:inline">{shared ? 'Link Copied!' : 'Share'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95 disabled:opacity-50"
            >
              {downloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : downloadSuccess ? (
                <Check className="w-4 h-4 text-white" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{downloading ? 'Downloading...' : downloadSuccess ? 'Downloaded!' : 'Download Bill'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Statement Viewer Canvas */}
      <main className="max-w-4xl mx-auto w-full p-3 sm:p-6 flex flex-col items-center flex-grow">
        <div className="w-full bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-slate-200 overflow-hidden flex flex-col items-center p-2 sm:p-6">
          <img
            src={imageUrl}
            alt={`Account Statement for ${partyName}`}
            className="w-full max-w-[850px] h-auto object-contain rounded-xl shadow-sm border border-slate-100"
            loading="eager"
          />
        </div>
      </main>

      {/* Floating Bottom Download Action Bar on Mobile */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200 z-50 flex items-center justify-center shadow-2xl">
        <div className="max-w-md w-full flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="flex-1 py-3.5 px-6 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition disabled:opacity-50"
          >
            {downloading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Downloading Statement...</span>
              </>
            ) : downloadSuccess ? (
              <>
                <Check className="w-5 h-5" />
                <span>Bill Downloaded to Device!</span>
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                <span>Download Bill Image (बिल डाउनलोड करें)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewStatement;
