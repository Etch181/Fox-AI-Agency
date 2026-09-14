import React, { useState, useRef } from "react";
import { useApp } from "../../context/AppContext";
import { Bot, FileText, Link as LinkIcon, Upload, CheckCircle2, Loader2, X, PlusCircle } from "lucide-react";

export const ClientKnowledgeBuilder: React.FC = () => {
  const { currentWorkspace, addKnowledgeFact, addToast, language } = useApp();
  const isAr = language === "ar";
  const [activeTab, setActiveTab] = useState<"upload" | "url">("upload");
  const [url, setUrl] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedFacts, setExtractedFacts] = useState<{question: string, answer: string, selected: boolean}[]>([]);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!currentWorkspace) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file size (limit to 5MB for base64 upload)
    if (file.size > 5 * 1024 * 1024) {
      addToast(isAr ? "حجم الملف كبير جداً (الحد الأقصى 5 ميجا)" : "File is too large (max 5MB)", "error");
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64String = (event.target?.result as string).split(',')[1];
      await processExtraction({
        type: 'file',
        mimeType: file.type,
        content: base64String
      });
    };
    reader.readAsDataURL(file);
  };

  const handleUrlSubmit = async () => {
    if (!url) return;
    await processExtraction({ type: 'url', url });
  };

  const processExtraction = async (payload: any) => {
    setIsExtracting(true);
    setExtractedFacts([]);
    try {
      const res = await fetch("/api/ai/extract-knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setExtractedFacts(data.map((item: any) => ({ ...item, selected: true })));
        addToast(isAr ? "تم استخراج المعرفة بنجاح" : "Knowledge extracted successfully", "success");
      } else {
        throw new Error(data.error || "Failed to extract");
      }
    } catch (err: any) {
      addToast(err.message, "error");
    } finally {
      setIsExtracting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSaveSelected = () => {
    const selected = extractedFacts.filter(f => f.selected);
    if (selected.length === 0) return;
    
    selected.forEach(fact => {
      addKnowledgeFact({
        workspaceId: currentWorkspace.id,
        question: fact.question,
        answer: fact.answer,
        fact: `Q: ${fact.question}\nA: ${fact.answer}`,
        category: "Uploaded Doc",
        approved: true,
        source: "ai_extracted"
      });
    });
    
    addToast(isAr ? `تم إضافة ${selected.length} معلومة بنجاح` : `Successfully added ${selected.length} facts`, "success");
    setExtractedFacts([]);
    setFileName("");
    setUrl("");
  };

  const toggleFactSelection = (index: number) => {
    const newFacts = [...extractedFacts];
    newFacts[index].selected = !newFacts[index].selected;
    setExtractedFacts(newFacts);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Bot className="h-5 w-5 text-indigo-500" />
            {isAr ? "باني المعرفة الذكي (AI Knowledge Builder)" : "AI Knowledge Builder"}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isAr ? "ارفع ملف أو أدخل رابط موقع ليقوم الذكاء الاصطناعي باستخراج الأسئلة والأجوبة تلقائياً" : "Upload a file or enter a URL to automatically extract Q&A pairs."}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab("upload")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${activeTab === "upload" ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400" : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"}`}
          >
            <Upload className="h-4 w-4" />
            {isAr ? "رفع ملف" : "Upload File"}
          </button>
          <button
            onClick={() => setActiveTab("url")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${activeTab === "url" ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400" : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"}`}
          >
            <LinkIcon className="h-4 w-4" />
            {isAr ? "رابط موقع" : "Website URL"}
          </button>
        </div>

        {activeTab === "upload" && (
          <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center bg-slate-50 dark:bg-slate-800/50">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
              onChange={handleFileUpload} 
            />
            {isExtracting ? (
              <div className="flex flex-col items-center justify-center space-y-3">
                <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  {isAr ? "جاري قراءة الملف واستخراج المعرفة..." : "Reading file & extracting knowledge..."}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-3">
                <div className="h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {fileName ? fileName : (isAr ? "اضغط لرفع ملف (PDF, Word, Excel, TXT)" : "Click to upload (PDF, Word, Excel, TXT)")}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Max 5MB</p>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 px-5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                >
                  {isAr ? "اختر ملف" : "Choose File"}
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "url" && (
          <div className="flex flex-col space-y-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
             <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block">
                {isAr ? "أدخل رابط الموقع (URL)" : "Enter Website URL"}
              </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="flex-1 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                disabled={isExtracting}
              />
              <button
                onClick={handleUrlSubmit}
                disabled={isExtracting || !url}
                className="flex items-center justify-center px-6 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {isExtracting ? <Loader2 className="h-5 w-5 animate-spin" /> : (isAr ? "استخراج" : "Extract")}
              </button>
            </div>
          </div>
        )}
      </div>

      {extractedFacts.length > 0 && (
        <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm dark:border-emerald-900/50 dark:bg-slate-900">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              {isAr ? `تم استخراج ${extractedFacts.length} أسئلة وأجوبة` : `Extracted ${extractedFacts.length} Q&A pairs`}
            </h4>
            <div className="flex gap-2">
               <button
                onClick={() => setExtractedFacts([])}
                className="text-xs font-bold text-slate-500 hover:text-slate-700 px-3 py-1.5"
              >
                {isAr ? "إلغاء" : "Cancel"}
              </button>
              <button
                onClick={handleSaveSelected}
                className="text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-1.5 rounded-lg flex items-center gap-1.5 transition"
              >
                <PlusCircle className="h-4 w-4" />
                {isAr ? "إضافة المحدد للقاعدة" : "Add Selected"}
              </button>
            </div>
          </div>
          
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {extractedFacts.map((fact, idx) => (
              <div 
                key={idx} 
                onClick={() => toggleFactSelection(idx)}
                className={`p-3 rounded-xl border cursor-pointer transition-colors ${fact.selected ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800'}`}
              >
                <div className="flex gap-3">
                  <div className="mt-0.5">
                    <div className={`h-5 w-5 rounded-md border flex items-center justify-center ${fact.selected ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 dark:border-slate-600'}`}>
                      {fact.selected && <CheckCircle2 className="h-3 w-3 text-white" />}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                      <span className="text-emerald-600 dark:text-emerald-400 mr-1">Q:</span>
                      {fact.question}
                    </p>
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      <span className="text-slate-400 mr-1">A:</span>
                      {fact.answer}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
