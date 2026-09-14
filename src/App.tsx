import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, CheckSquare, Mail, AlertTriangle, MessageSquare,
  ChevronRight, ArrowLeft, Loader2, Copy, Check, LayoutTemplate,
  RefreshCw
} from 'lucide-react';
import { marked } from 'marked';
import { AppState, Language, ExtractedData } from './types';
import { uiTranslations } from './translations';

export default function App() {
  const [state, setState] = useState<AppState>({
    step: 1,
    transcript: '',
    extractedData: { stakeholders: '', terms: '', dates: '', nextSteps: '' },
    language: 'pt',
    email: '',
    risks: '',
    report: '',
    isLoading: false,
    error: null,
  });

  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedReport, setCopiedReport] = useState(false);

  const t = uiTranslations[state.language];

  const updateState = (updates: Partial<AppState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const handleExtract = async () => {
    if (!state.transcript.trim()) return;
    updateState({ isLoading: true, error: null });
    
    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          transcript: state.transcript,
          language: state.language
        })
      });
      
      if (!res.ok) throw new Error(t.errExtract);
      
      const data = await res.json();
      updateState({ 
        extractedData: data, 
        step: 2, 
        isLoading: false 
      });
    } catch (err: any) {
      updateState({ error: err.message, isLoading: false });
    }
  };

  const handleGenerateEmail = async () => {
    updateState({ isLoading: true, error: null });
    
    try {
      const res = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...state.extractedData,
          transcript: state.transcript,
          language: state.language
        })
      });
      
      if (!res.ok) throw new Error(t.errEmail);
      
      const data = await res.json();
      updateState({ 
        email: data.email, 
        step: 3, 
        isLoading: false 
      });
    } catch (err: any) {
      updateState({ error: err.message, isLoading: false });
    }
  };

  const handleGenerateRisks = async () => {
    updateState({ isLoading: true, error: null });
    
    try {
      const res = await fetch('/api/risks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: state.email,
          transcript: state.transcript,
          language: state.language
        })
      });
      
      if (!res.ok) throw new Error(t.errRisks);
      
      const data = await res.json();
      updateState({ 
        risks: data.risks, 
        step: 4, 
        isLoading: false 
      });
    } catch (err: any) {
      updateState({ error: err.message, isLoading: false });
    }
  };

  const handleGenerateReport = async () => {
    updateState({ isLoading: true, error: null });
    
    try {
      const res = await fetch('/api/slack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          risks: state.risks,
          language: state.language
        })
      });
      
      if (!res.ok) throw new Error(t.errReport);
      
      const data = await res.json();
      updateState({ 
        report: data.report, 
        step: 5, 
        isLoading: false 
      });
    } catch (err: any) {
      updateState({ error: err.message, isLoading: false });
    }
  };

  const handleGenerateFinal = async () => {
    updateState({ isLoading: true, error: null });
    
    try {
      const res = await fetch('/api/slack_final', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report: state.report })
      });
      
      if (!res.ok) throw new Error(t.errFinal);
      
      const data = await res.json();
      updateState({ 
        finalReport: data.finalReport, 
        step: 6, 
        isLoading: false 
      });
    } catch (err: any) {
      updateState({ error: err.message, isLoading: false });
    }
  };

  const copyEmailHTML = async () => {
    try {
      const htmlContent = await marked.parse(state.email);
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const clipboardItem = new ClipboardItem({ 'text/html': blob });
      await navigator.clipboard.write([clipboardItem]);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    } catch (err) {
      console.error('Failed to copy html: ', err);
    }
  };

  const copyReportText = async () => {
    try {
      await navigator.clipboard.writeText(state.report);
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const copyFinalReportText = async () => {
    try {
      await navigator.clipboard.writeText(state.finalReport);
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-200">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-800">{t.appTitle}</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-500">{t.language}</span>
            <div className="flex bg-slate-100 p-1 rounded-md">
              {(['pt', 'en', 'es'] as Language[]).map(lang => (
                <button
                  key={lang}
                  onClick={() => updateState({ language: lang })}
                  className={`px-3 py-1 text-xs font-semibold uppercase rounded-sm transition-colors ${state.language === lang ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8">
        
        {/* Sidebar Steps */}
        <aside className="w-full md:w-64 flex-shrink-0">
          <nav className="space-y-1">
            {[
              { num: 1, label: t.step1, icon: FileText },
              { num: 2, label: t.step2, icon: CheckSquare },
              { num: 3, label: t.step3, icon: Mail },
              { num: 4, label: t.step4, icon: AlertTriangle },
              { num: 5, label: t.step5, icon: FileText },
              { num: 6, label: t.step6, icon: MessageSquare }
            ].map(s => (
              <div 
                key={s.num}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${state.step === s.num ? 'bg-blue-50 text-blue-700 font-medium' : state.step > s.num ? 'text-slate-600' : 'text-slate-400'}`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${state.step === s.num ? 'bg-blue-600 text-white' : state.step > s.num ? 'bg-slate-200 text-slate-600' : 'bg-slate-100 text-slate-400'}`}>
                  {state.step > s.num ? <Check className="w-4 h-4" /> : s.num}
                </div>
                <span className="text-sm">{s.label}</span>
              </div>
            ))}
          </nav>
        </aside>

        {/* Content Area */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[600px]">
          <AnimatePresence mode="wait">
            {state.error && (
              <div className="m-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <span>{state.error}</span>
              </div>
            )}

            {/* STEP 1: Input */}
            {state.step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="p-6 md:p-8 flex flex-col h-full"
              >
                <h2 className="text-2xl font-bold text-slate-800 mb-2">{t.step1Title}</h2>
                <p className="text-slate-500 mb-6">{t.step1Desc}</p>
                
                <textarea 
                  value={state.transcript}
                  onChange={e => updateState({ transcript: e.target.value })}
                  placeholder={t.step1Placeholder}
                  className="flex-1 w-full p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none font-mono text-sm shadow-inner"
                  rows={15}
                />
                
                <div className="mt-6 flex justify-end">
                  <button 
                    onClick={handleExtract}
                    disabled={!state.transcript.trim() || state.isLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {state.isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : t.step1Btn}
                    {!state.isLoading && <ChevronRight className="w-5 h-5" />}
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 2: Validation */}
            {state.step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="p-6 md:p-8 flex flex-col h-full"
              >
                <div className="flex items-center gap-3 mb-2">
                  <button onClick={() => updateState({ step: 1 })} className="p-1 hover:bg-slate-100 rounded-md text-slate-500">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <h2 className="text-2xl font-bold text-slate-800">{t.step2Title}</h2>
                </div>
                <p className="text-slate-500 mb-6">{t.step2Desc}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 overflow-y-auto">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">{t.s2Field1}</label>
                    <textarea 
                      value={state.extractedData.stakeholders}
                      onChange={e => updateState({ extractedData: { ...state.extractedData, stakeholders: e.target.value } })}
                      className="w-full p-3 border border-slate-300 rounded-lg text-sm h-32 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">{t.s2Field2}</label>
                    <textarea 
                      value={state.extractedData.terms}
                      onChange={e => updateState({ extractedData: { ...state.extractedData, terms: e.target.value } })}
                      className="w-full p-3 border border-slate-300 rounded-lg text-sm h-32 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">{t.s2Field3}</label>
                    <textarea 
                      value={state.extractedData.dates}
                      onChange={e => updateState({ extractedData: { ...state.extractedData, dates: e.target.value } })}
                      className="w-full p-3 border border-slate-300 rounded-lg text-sm h-32 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">{t.s2Field4}</label>
                    <textarea 
                      value={state.extractedData.nextSteps}
                      onChange={e => updateState({ extractedData: { ...state.extractedData, nextSteps: e.target.value } })}
                      className="w-full p-3 border border-slate-300 rounded-lg text-sm h-32 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div className="mt-6 flex justify-between items-center">
                  <span className="text-sm text-slate-500">{t.step2Note}</span>
                  <div className="flex items-center gap-3">
                    {state.error && (
                      <button 
                        onClick={handleExtract}
                        disabled={state.isLoading}
                        className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors border border-red-200"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Tentar Novamente
                      </button>
                    )}
                    <button 
                      onClick={handleGenerateEmail}
                      disabled={state.isLoading}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {state.isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : t.step2Btn}
                      {!state.isLoading && <ChevronRight className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 3: Email Edit */}
            {state.step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="flex h-full"
              >
                {/* Email Template Sidebar */}
                <div className="w-48 border-r border-slate-200 p-4 bg-slate-50 hidden sm:block">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <LayoutTemplate className="w-4 h-4" />
                    {t.step3Templates}
                  </h3>
                  <div className="space-y-2">
                    <button className="w-full text-left px-3 py-2 bg-blue-100 text-blue-700 rounded-md text-sm font-medium border border-blue-200">
                      {t.step3Tpl1}
                    </button>
                    <button className="w-full text-left px-3 py-2 text-slate-500 rounded-md text-sm cursor-not-allowed opacity-60">
                      {t.step3Tpl2}
                    </button>
                    <button className="w-full text-left px-3 py-2 text-slate-500 rounded-md text-sm cursor-not-allowed opacity-60">
                      {t.step3Tpl3}
                    </button>
                  </div>
                </div>

                <div className="flex-1 p-6 flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <button onClick={() => updateState({ step: 2 })} className="p-1 hover:bg-slate-100 rounded-md text-slate-500">
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                      <h2 className="text-2xl font-bold text-slate-800">{t.step3Title}</h2>
                    </div>
                    <button 
                      onClick={copyEmailHTML}
                      className="text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                    >
                      {copiedEmail ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                      {copiedEmail ? t.btnCopiedHtml : t.btnCopyEmail}
                    </button>
                  </div>
                  
                  <textarea 
                    value={state.email}
                    onChange={e => updateState({ email: e.target.value })}
                    className="flex-1 w-full p-5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none font-mono text-sm mb-6"
                  />
                  
                  <div className="flex justify-end gap-3">
                    {state.error && (
                      <button 
                        onClick={handleGenerateEmail}
                        disabled={state.isLoading}
                        className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors border border-red-200"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Tentar Novamente
                      </button>
                    )}
                    <button 
                      onClick={handleGenerateRisks}
                      disabled={state.isLoading}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {state.isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : t.step3Btn}
                      {!state.isLoading && <ChevronRight className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 4: Risk Curation */}
            {state.step === 4 && (
              <motion.div 
                key="step4"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="p-6 md:p-8 flex flex-col h-full"
              >
                <div className="flex items-center gap-3 mb-2">
                  <button onClick={() => updateState({ step: 3 })} className="p-1 hover:bg-slate-100 rounded-md text-slate-500">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <h2 className="text-2xl font-bold text-slate-800">{t.step4Title}</h2>
                </div>
                <p className="text-slate-500 mb-6">{t.step4Desc}</p>
                
                <textarea 
                  value={state.risks}
                  onChange={e => updateState({ risks: e.target.value })}
                  className="flex-1 w-full p-5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none font-mono text-sm mb-6"
                />
                
                <div className="flex justify-end gap-3">
                  {state.error && (
                    <button 
                      onClick={handleGenerateRisks}
                      disabled={state.isLoading}
                      className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors border border-red-200"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Tentar Novamente
                    </button>
                  )}
                  <button 
                    onClick={handleGenerateReport}
                    disabled={state.isLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {state.isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : t.step4Btn}
                    {!state.isLoading && <ChevronRight className="w-5 h-5" />}
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 5: Draft Report */}
            {state.step === 5 && (
              <motion.div 
                key="step5"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="p-6 md:p-8 flex flex-col h-full"
              >
                <div className="flex items-center gap-3 mb-2">
                  <button onClick={() => updateState({ step: 4 })} className="p-1 hover:bg-slate-100 rounded-md text-slate-500">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <h2 className="text-2xl font-bold text-slate-800">{t.step5Title}</h2>
                </div>
                <p className="text-slate-500 mb-6">{t.step5Desc}</p>
                
                <textarea 
                  value={state.report}
                  onChange={e => updateState({ report: e.target.value })}
                  className="flex-1 w-full p-5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none font-mono text-sm mb-6"
                />
                
                <div className="flex justify-end gap-3">
                  {state.error && (
                    <button 
                      onClick={handleGenerateReport}
                      disabled={state.isLoading}
                      className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors border border-red-200"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Tentar Novamente
                    </button>
                  )}
                  <button 
                    onClick={handleGenerateFinal}
                    disabled={state.isLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {state.isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : t.step5Btn}
                    {!state.isLoading && <ChevronRight className="w-5 h-5" />}
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 6: Final Report */}
            {state.step === 6 && (
              <motion.div 
                key="step6"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="p-6 md:p-8 flex flex-col h-full items-center justify-center text-center overflow-y-auto"
              >
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6 flex-shrink-0">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">{t.step6Title}</h2>
                <p className="text-slate-500 mb-8 max-w-lg">{t.step6Desc}</p>
                
                <div className="w-full max-w-2xl bg-slate-50 border border-slate-200 rounded-xl p-6 text-left relative group">
                  <button 
                    onClick={copyFinalReportText}
                    className="absolute top-4 right-4 text-slate-400 hover:text-blue-600 bg-white shadow-sm border border-slate-200 px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors"
                  >
                    {copiedReport ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedReport ? t.btnCopiedText : t.btnCopyReport}
                  </button>
                  <div className="whitespace-pre-wrap font-sans text-sm text-slate-700 pt-8 sm:pt-0 pr-0 sm:pr-24">
                    {state.finalReport}
                  </div>
                </div>

                <div className="mt-8 flex gap-4">
                  {state.error && (
                    <button 
                      onClick={handleGenerateFinal}
                      disabled={state.isLoading}
                      className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 font-medium flex items-center gap-2 transition-colors border border-red-200 rounded-lg"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Tentar Novamente
                    </button>
                  )}
                  <button 
                    onClick={() => updateState({ step: 5 })}
                    className="text-slate-600 hover:text-slate-800 px-4 py-2 font-medium transition-colors"
                  >
                    {t.btnBack}
                  </button>
                  <button 
                    onClick={() => updateState({ 
                      step: 1, transcript: '', email: '', risks: '', report: '', finalReport: '',
                      extractedData: { stakeholders: '', terms: '', dates: '', nextSteps: '' }, error: null
                    })}
                    className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                  >
                    {t.btnNew}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

