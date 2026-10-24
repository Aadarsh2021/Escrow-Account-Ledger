import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Send, 
  Download, 
  Copy, 
  Check, 
  Phone, 
  Loader2, 
  FileText, 
  AlertCircle,
  ExternalLink,
  Share2,
  Image as ImageIcon
} from 'lucide-react';
import html2canvas from 'html2canvas';
import type { Party, Transaction } from '../../hooks/useLedgerTransactions';
import { supabase, serviceSupabase } from '../../lib/supabase';

async function shortenUrl(longUrl?: string | null): Promise<string> {
  if (!longUrl || typeof longUrl !== 'string' || longUrl.length < 35) return longUrl || '';
  
  // 1. is.gd (Full browser CORS support, instant short link)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`https://is.gd/create.php?format=json&url=${encodeURIComponent(longUrl)}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const json = await res.json();
      if (json?.shorturl) {
        return json.shorturl;
      }
    }
  } catch (err) {
    console.warn('is.gd failed, trying v.gd:', err);
  }

  // 2. v.gd fallback (Full browser CORS support)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`https://v.gd/create.php?format=json&url=${encodeURIComponent(longUrl)}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const json = await res.json();
      if (json?.shorturl) {
        return json.shorturl;
      }
    }
  } catch (err) {
    console.warn('v.gd fallback failed:', err);
  }

  return longUrl;
}

interface WhatsAppReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  party: Party | null;
  transactions: Transaction[];
  companyName?: string;
  companyPhone?: string;
  onPartyPhoneUpdated?: (partyId: string, phone: string) => void;
}

export const WhatsAppReportModal: React.FC<WhatsAppReportModalProps> = ({
  isOpen,
  onClose,
  party,
  transactions,
  companyName = 'LOFFERS DTF',
  companyPhone = '',
  onPartyPhoneUpdated
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);
  const [phoneSaved, setPhoneSaved] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [copyNotice, setCopyNotice] = useState(false);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [billPublicUrl, setBillPublicUrl] = useState<string>('');
  const [uploadingCloud, setUploadingCloud] = useState<boolean>(false);
  const [includeBillLink, setIncludeBillLink] = useState<boolean>(false);
  const [canDirectShare, setCanDirectShare] = useState<boolean>(false);

  const reportCardRef = useRef<HTMLDivElement>(null);

  // Check if device supports direct file sharing (Mobile phones / tablets)
  useEffect(() => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        const dummyFile = new File(['1'], 'test.png', { type: 'image/png' });
        if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [dummyFile] })) {
          setCanDirectShare(true);
        }
      } catch {
        setCanDirectShare(false);
      }
    }
  }, []);

  useEffect(() => {
    if (party) {
      setPhoneNumber(party.phone || '');
      setPhoneSaved(false);
      setImageBlob(null);
      setImageUrl(null);
      setBillPublicUrl('');
    }
  }, [party?.id, isOpen]);

  // Generate screenshot of report card once modal is open and auto-upload to Supabase Storage
  useEffect(() => {
    if (!isOpen || !party) return;

    let timer = setTimeout(async () => {
      if (!reportCardRef.current) return;
      setGeneratingImage(true);
      try {
        const canvas = await html2canvas(reportCardRef.current, {
          scale: 2, // High resolution for crisp WhatsApp reading
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false
        });

        canvas.toBlob(async (blob) => {
          if (blob) {
            setImageBlob(blob);
            setImageUrl(URL.createObjectURL(blob));

            // Auto-upload bill to Supabase Storage 'statements' bucket in background
            try {
              setUploadingCloud(true);
              const cleanParty = (party.party_name || 'Client').replace(/[^a-zA-Z0-9_-]/g, '_');
              const fileName = `parties/${party.id}/bill_${cleanParty}_${Date.now()}.png`;

              const { error: upErr } = await serviceSupabase.storage
                .from('statements')
                .upload(fileName, blob, {
                  upsert: true,
                  contentType: 'image/png'
                });

              if (!upErr) {
                const { data: pubData } = serviceSupabase.storage
                  .from('statements')
                  .getPublicUrl(fileName);
                if (pubData?.publicUrl) {
                  const short = await shortenUrl(pubData.publicUrl);
                  setBillPublicUrl(short);
                }
              } else {
                console.warn('Background bill upload error:', upErr);
              }
            } catch (upEx) {
              console.warn('Background bill upload exception:', upEx);
            } finally {
              setUploadingCloud(false);
            }
          }
          setGeneratingImage(false);
        }, 'image/png');
      } catch (err) {
        console.error('Error generating ledger screenshot:', err);
        setGeneratingImage(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [isOpen, party?.id, transactions.length]);

  if (!isOpen || !party) return null;

  // Calculate totals
  const totalCredit = transactions.reduce((sum, t) => sum + (t.credit || 0), 0);
  const totalDebit = transactions.reduce((sum, t) => sum + (t.debit || 0), 0);
  const closingBalance = transactions.length > 0 ? (transactions[transactions.length - 1].balance || 0) : 0;
  const balanceType = closingBalance >= 0 ? 'CR' : 'DR';

  // Build clean WhatsApp phone number
  const cleanPhone = (num: string) => {
    const digits = num.replace(/\D/g, '');
    if (digits.length === 10) return `91${digits}`;
    if (digits.length > 10 && !digits.startsWith('91') && digits.length === 12) return digits;
    return digits;
  };

  // WhatsApp Message Template
  const formattedDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const messageTemplate = `*${companyName} - Account Statement* 📄\n\n` +
    `Dear *${party.party_name}*,\n` +
    `Here is your transaction ledger statement as of ${formattedDate}:\n\n` +
    `📊 *Total Entries:* ${transactions.length}\n` +
    `🔴 *Total Debit (DR):* ₹${Math.abs(Math.round(totalDebit)).toLocaleString('en-IN')}\n` +
    `🟢 *Total Credit (CR):* ₹${Math.round(totalCredit).toLocaleString('en-IN')}\n` +
    `📌 *Net Balance:* ₹${Math.abs(Math.round(closingBalance)).toLocaleString('en-IN')} ${balanceType}\n\n` +
    (includeBillLink ? (billPublicUrl ? `🔗 *View / Download Bill:*\n${billPublicUrl}\n\n` : (uploadingCloud ? `⏳ [Generating Short Bill Link...]\n\n` : '')) : '') +
    `Thank you for your business! 🙏\n` +
    `- *${companyName}*`;

  // Save phone number to database
  const handleSavePhone = async () => {
    if (!party || !phoneNumber.trim()) return;
    setSavingPhone(true);
    try {
      const { error } = await supabase
        .from('parties')
        .update({ phone: phoneNumber.trim() })
        .eq('id', party.id);

      if (error) throw error;
      setPhoneSaved(true);
      if (onPartyPhoneUpdated) {
        onPartyPhoneUpdated(party.id, phoneNumber.trim());
      }
      setTimeout(() => setPhoneSaved(false), 3000);
    } catch (err: any) {
      console.error('Error updating client phone:', err);
      alert('Error updating phone: ' + err.message);
    } finally {
      setSavingPhone(false);
    }
  };

  // Copy Image to Clipboard
  const handleCopyImage = async () => {
    if (!imageBlob) return;
    try {
      const item = new ClipboardItem({ 'image/png': imageBlob });
      await navigator.clipboard.write([item]);
      setCopiedImage(true);
      setTimeout(() => setCopiedImage(false), 3000);
    } catch (err) {
      console.warn('Clipboard write failed, downloading fallback:', err);
      handleDownloadImage();
    }
  };

  // Download Image
  const handleDownloadImage = () => {
    if (!imageUrl) return;
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `${companyName.replace(/\s+/g, '_')}_${party.party_name.replace(/\s+/g, '_')}_Statement.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Send / Open on WhatsApp (Direct Image Attachment on Mobile, Auto-Copy on Desktop)
  const handleSendWhatsApp = async () => {
    const targetPhone = cleanPhone(phoneNumber);
    if (!targetPhone) {
      alert('Please enter a valid client mobile number.');
      return;
    }

    let finalBillUrl = billPublicUrl;

    // Only upload to cloud storage if user requested a link
    if (includeBillLink && !finalBillUrl && imageBlob) {
      setUploadingCloud(true);
      try {
        const cleanParty = (party.party_name || 'Client').replace(/[^a-zA-Z0-9_-]/g, '_');
        const fileName = `parties/${party.id}/bill_${cleanParty}_${Date.now()}.png`;
        const { error: upErr } = await serviceSupabase.storage
          .from('statements')
          .upload(fileName, imageBlob, { upsert: true, contentType: 'image/png' });
        if (!upErr) {
          const { data: pubData } = serviceSupabase.storage
            .from('statements')
            .getPublicUrl(fileName);
          if (pubData?.publicUrl) {
            const short = await shortenUrl(pubData.publicUrl);
            finalBillUrl = short;
            setBillPublicUrl(short);
          }
        }
      } catch (e) {
        console.warn('Upload error:', e);
      } finally {
        setUploadingCloud(false);
      }
    }

    // Auto-save phone if it was newly entered or changed
    if (phoneNumber.trim() && phoneNumber.trim() !== party.phone) {
      handleSavePhone();
    }

    const finalMsg = `*${companyName} - Account Statement* 📄\n\n` +
      `Dear *${party.party_name}*,\n` +
      `Here is your transaction ledger statement as of ${formattedDate}:\n\n` +
      `📊 *Total Entries:* ${transactions.length}\n` +
      `🔴 *Total Debit (DR):* ₹${Math.abs(Math.round(totalDebit)).toLocaleString('en-IN')}\n` +
      `🟢 *Total Credit (CR):* ₹${Math.round(totalCredit).toLocaleString('en-IN')}\n` +
      `📌 *Net Balance:* ₹${Math.abs(Math.round(closingBalance)).toLocaleString('en-IN')} ${balanceType}\n\n` +
      (includeBillLink && finalBillUrl ? `🔗 *View / Download Bill:*\n${finalBillUrl}\n\n` : '') +
      `Thank you for your business! 🙏\n` +
      `- *${companyName}*`;

    // 1. Mobile Direct Image Share: Uses Native Web Share API to attach image directly to WhatsApp
    if (canDirectShare && imageBlob) {
      // Auto-copy template text to clipboard so it is ready to paste into the WhatsApp caption box
      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(finalMsg);
        }
      } catch {}

      try {
        const cleanParty = (party.party_name || 'Client').replace(/[^a-zA-Z0-9_-]/g, '_');
        const file = new File([imageBlob], `${companyName.replace(/\s+/g, '_')}_${cleanParty}_Statement.png`, { type: 'image/png' });
        await navigator.share({
          title: `${companyName} - ${party.party_name} Statement`,
          text: finalMsg,
          files: [file]
        });
        return;
      } catch (shareErr: any) {
        if (shareErr.name === 'AbortError') return;
        console.warn('Native share failed, falling back to WhatsApp link:', shareErr);
      }
    }

    // 2. Desktop Fallback: Copy Image to Clipboard so user can directly paste (Ctrl+V) in WhatsApp Web
    if (imageBlob) {
      try {
        const item = new ClipboardItem({ 'image/png': imageBlob });
        await navigator.clipboard.write([item]);
        setCopyNotice(true);
        setTimeout(() => setCopyNotice(false), 6000);
      } catch (clipErr) {
        console.warn('Clipboard write skipped:', clipErr);
      }
    }

    const encodedText = encodeURIComponent(finalMsg);
    const waUrl = `https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodedText}`;

    // Universally open WhatsApp without popup blockers
    try {
      const link = document.createElement('a');
      link.href = waUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (document.body.contains(link)) document.body.removeChild(link);
      }, 100);
    } catch {
      window.open(waUrl, '_blank');
    }
  };

  // Send Pure Text Statement directly to WhatsApp (Always pre-fills text, 100% reliable)
  const handleSendTextOnly = () => {
    const targetPhone = cleanPhone(phoneNumber);
    if (!targetPhone) {
      alert('Please enter a valid client mobile number.');
      return;
    }

    if (phoneNumber.trim() && phoneNumber.trim() !== party.phone) {
      handleSavePhone();
    }

    const finalMsg = `*${companyName} - Account Statement* 📄\n\n` +
      `Dear *${party.party_name}*,\n` +
      `Here is your transaction ledger statement as of ${formattedDate}:\n\n` +
      `📊 *Total Entries:* ${transactions.length}\n` +
      `🔴 *Total Debit (DR):* ₹${Math.abs(Math.round(totalDebit)).toLocaleString('en-IN')}\n` +
      `🟢 *Total Credit (CR):* ₹${Math.round(totalCredit).toLocaleString('en-IN')}\n` +
      `📌 *Net Balance:* ₹${Math.abs(Math.round(closingBalance)).toLocaleString('en-IN')} ${balanceType}\n\n` +
      (includeBillLink && billPublicUrl ? `🔗 *View / Download Bill:*\n${billPublicUrl}\n\n` : '') +
      `Thank you for your business! 🙏\n` +
      `- *${companyName}*`;

    const encodedText = encodeURIComponent(finalMsg);
    const waUrl = `https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodedText}`;

    try {
      const link = document.createElement('a');
      link.href = waUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (document.body.contains(link)) document.body.removeChild(link);
      }, 100);
    } catch {
      window.open(waUrl, '_blank');
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-2.5 sm:p-4 md:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity" 
        onClick={onClose} 
      />

      {/* Modal Dialog */}
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-4 sm:p-6 md:p-7 z-10 max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-start sm:items-center justify-between pb-3 sm:pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 shrink-0">
              <Send className="w-4 h-4 sm:w-5 sm:h-5 -rotate-12 translate-x-0.5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                WhatsApp Statement
                <span className="text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 font-bold rounded-full">
                  LOFFERS DTF
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                Send professional transaction statement screenshot directly to client
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 sm:p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full transition-all shrink-0"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Content Body - Scrollable */}
        <div className="flex-1 overflow-y-auto py-5 space-y-6 pr-1 custom-scrollbar">
          
          {/* Client Mobile Number Card */}
          <div className="bg-slate-50 dark:bg-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                    Client Mobile Number ({party.party_name})
                  </label>
                  <p className="text-xs text-slate-400">WhatsApp message & report will be sent to this number</p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full sm:w-56 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleSavePhone}
                  disabled={savingPhone || !phoneNumber.trim()}
                  className="px-3.5 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs whitespace-nowrap transition-all flex items-center gap-1.5"
                >
                  {savingPhone ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : phoneSaved ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      Saved
                    </>
                  ) : (
                    'Save'
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Screenshot Preview & Status */}
          <div className="space-y-3">
            <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2.5">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-500" />
                Statement Screenshot Preview
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleCopyImage}
                  disabled={!imageBlob}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {copiedImage ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedImage ? 'Copied Image!' : 'Copy Image'}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadImage}
                  disabled={!imageUrl}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download PNG
                </button>
              </div>
            </div>

            {/* Generated Image Preview Box */}
            <div className="relative bg-slate-100 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 max-h-72 overflow-y-auto flex items-center justify-center">
              {generatingImage ? (
                <div className="py-12 flex flex-col items-center gap-2 text-slate-400">
                  <Loader2 className="w-7 h-7 animate-spin text-emerald-500" />
                  <span className="text-xs font-bold">Generating high-resolution statement screenshot...</span>
                </div>
              ) : imageUrl ? (
                <img 
                  src={imageUrl} 
                  alt="Statement Preview" 
                  className="w-full max-w-2xl rounded-xl shadow-md border border-slate-200 dark:border-slate-800 object-contain mx-auto" 
                />
              ) : (
                <div className="py-12 text-xs font-bold text-slate-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  Generating screenshot preview...
                </div>
              )}
            </div>
          </div>

          {/* Copy Notice Banner */}
          {copyNotice && (
            <div className="bg-emerald-600 text-white p-3.5 rounded-2xl text-xs font-bold flex items-center justify-between shadow-lg shadow-emerald-600/20 animate-in slide-in-from-top-2">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>📸 Bill Image copied to clipboard! In WhatsApp Web, simply press <b>Ctrl + V</b> to send the image directly.</span>
              </div>
              <button 
                type="button" 
                onClick={() => setCopyNotice(false)} 
                className="text-white/80 hover:text-white ml-2 text-sm font-black"
              >
                ✕
              </button>
            </div>
          )}

          {/* Options: Direct Image vs Short Link */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Direct Bill Image: {canDirectShare ? 'Auto-attached via WhatsApp' : 'Auto-copied for 1-click Ctrl+V'}
              </span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-slate-600 dark:text-slate-400">
              <input
                type="checkbox"
                checked={includeBillLink}
                onChange={(e) => setIncludeBillLink(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
              />
              <span>Include view/download link in message</span>
            </label>
          </div>

          {/* WhatsApp Text Template Preview */}
          <div className="space-y-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              WhatsApp Message Preview
            </span>
            <div className="bg-emerald-50/60 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-mono whitespace-pre-line leading-relaxed">
              {messageTemplate}
            </div>
          </div>

          {/* Tips / Instructions */}
          <div className="bg-emerald-50/70 dark:bg-emerald-950/20 p-3.5 rounded-xl border border-emerald-100 dark:border-emerald-900/30 flex items-start gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
            <span className="text-base">🚀</span>
            <p className="leading-relaxed">
              <strong>WhatsApp Sending Options:</strong><br />
              • <strong>Send Text Statement:</strong> Opens client chat with full template text pre-filled — simply tap Send!<br />
              • <strong>Send Bill Photo:</strong> Shares the formal bill statement photo directly (text is also copied to clipboard if you want to paste as caption).
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3.5 sm:pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 sm:py-3 rounded-2xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-sm transition-all"
          >
            Close
          </button>

          <div className="flex flex-col-reverse xs:flex-row items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleSendTextOnly}
              disabled={!phoneNumber.trim()}
              className="w-full sm:w-auto px-5 py-3 sm:py-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              <FileText className="w-4 h-4 text-emerald-600" />
              Send Text Statement
            </button>

            <button
              type="button"
              onClick={handleSendWhatsApp}
              disabled={!phoneNumber.trim() || uploadingCloud}
              className="w-full sm:w-auto px-6 py-3 sm:py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xl shadow-emerald-600/25 active:scale-95 disabled:opacity-50"
            >
              {uploadingCloud ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : canDirectShare ? (
                <Share2 className="w-4 h-4" />
              ) : (
                <ImageIcon className="w-4 h-4" />
              )}
              {uploadingCloud ? 'Preparing...' : 'Send Bill Photo'}
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </button>
          </div>
        </div>
      </div>

      {/* HIDDEN OFSCREEN STATEMENT CARD FOR HIGH-RES HTML2CANVAS SCREENSHOT */}
      <div className="fixed -left-[9999px] -top-[9999px] pointer-events-none" aria-hidden="true">
        <div 
          ref={reportCardRef}
          className="w-[800px] bg-white text-slate-900 p-8 font-sans border border-slate-200"
          style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
        >
          {/* Invoice Header */}
          <div className="flex justify-between items-start pb-6 border-b-2 border-slate-900">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">
                {companyName}
              </h1>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
                Account Statement & Bill
              </p>
              {companyPhone && (
                <p className="text-xs font-semibold text-slate-600 mt-1">
                  Ph: {companyPhone}
                </p>
              )}
            </div>

            <div className="text-right">
              <div className="inline-block bg-slate-900 text-white px-3 py-1 rounded text-xs font-black uppercase tracking-wider mb-2">
                STATEMENT
              </div>
              <p className="text-xs font-bold text-slate-500">Date: {formattedDate}</p>
              <p className="text-xs font-bold text-slate-500">Total Entries: {transactions.length}</p>
            </div>
          </div>

          {/* Client Details Bar */}
          <div className="grid grid-cols-2 gap-4 py-4 my-4 bg-slate-50 rounded-xl px-5 border border-slate-200">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Statement For (Client)</p>
              <h3 className="text-lg font-black text-slate-900 mt-0.5">{party.party_name}</h3>
              <p className="text-xs font-bold text-slate-500">SR NO: {party.sr_no}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Client Mobile</p>
              <h3 className="text-base font-black text-slate-800 mt-0.5">{phoneNumber || party.phone || 'N/A'}</h3>
            </div>
          </div>

          {/* Transaction Table */}
          <table className="w-full text-left border-collapse my-4 text-xs">
            <thead>
              <tr className="border-b-2 border-slate-300 bg-slate-100 text-slate-700 uppercase font-black text-[10px] tracking-wider">
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Particulars & Calculation</th>
                <th className="py-2.5 px-3 text-right">Debit (DR ₹)</th>
                <th className="py-2.5 px-3 text-right">Credit (CR ₹)</th>
                <th className="py-2.5 px-3 text-right">Balance (₹)</th>
              </tr>
            </thead>
            <tbody className="font-medium">
              {transactions.map((t, idx) => (
                <tr key={t.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                  <td className="py-2 px-3 text-slate-400 font-bold">{idx + 1}</td>
                  <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                    {t.transaction_date ? new Date(t.transaction_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : (t.created_at ? new Date(t.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '-')}
                  </td>
                  <td className="py-2 px-3 font-semibold text-slate-800">
                    <span className="font-bold">{t.partner_party_name || companyName}</span>
                    {t.remarks && (
                      <span className="ml-1 text-slate-500 font-medium">
                        {t.remarks.startsWith('(') ? t.remarks : `(${t.remarks})`}
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-rose-600 whitespace-nowrap">
                    {t.debit > 0 ? `₹${Math.round(t.debit).toLocaleString('en-IN')}` : '-'}
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-emerald-600 whitespace-nowrap">
                    {t.credit > 0 ? `₹${Math.round(t.credit).toLocaleString('en-IN')}` : '-'}
                  </td>
                  <td className="py-2 px-3 text-right font-black text-slate-900 whitespace-nowrap">
                    ₹{Math.abs(Math.round(t.balance)).toLocaleString('en-IN')} {t.balance >= 0 ? 'CR' : 'DR'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Statement Summary & Closing Balance */}
          <div className="pt-4 border-t-2 border-slate-900 mt-6 grid grid-cols-2 items-center">
            <div>
              <p className="text-xs text-slate-500 font-medium italic">
                * Computer generated ledger statement by {companyName}.
              </p>
              <p className="text-xs font-bold text-slate-700 mt-1">
                Thank you for your business!
              </p>
            </div>

            <div className="bg-slate-100 p-4 rounded-2xl border border-slate-300 space-y-1.5 text-right">
              <div className="flex justify-between text-xs font-bold text-slate-600">
                <span>Total Debit:</span>
                <span className="text-rose-600">₹{Math.abs(Math.round(totalDebit)).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-600">
                <span>Total Credit:</span>
                <span className="text-emerald-600">₹{Math.round(totalCredit).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-300">
                <span>Net Closing Balance:</span>
                <span className={closingBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                  ₹{Math.abs(Math.round(closingBalance)).toLocaleString('en-IN')} {closingBalance >= 0 ? 'CR' : 'DR'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
