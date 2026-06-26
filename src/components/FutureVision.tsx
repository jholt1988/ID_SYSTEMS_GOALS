import { useState, useRef, useEffect } from 'react';
import { Sparkles, Image as ImageIcon, Video, Loader2, Upload, AlertTriangle } from 'lucide-react';
import { aiPost, loadSettings, providerSupports, NotConfiguredError } from '../lib/aiClient';

export default function FutureVision() {
  const [activeSubtab, setActiveSubtab] = useState<'image' | 'video'>('image');
  
  // Image State
  const [timeline, setTimeline] = useState<'30' | '60' | '90'>('30');
  const [imagePrompt, setImagePrompt] = useState('My future self feeling healthy, energetic, and organized, working in a clean bright workspace.');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  
  // Video State
  const [videoPrompt, setVideoPrompt] = useState('A cinematic shot of my future day in the life, starting the morning with focus and clarity.');
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [videoOperationName, setVideoOperationName] = useState<string | null>(null);
  const [isVideoDone, setIsVideoDone] = useState(false);
  const [isStartingVideo, setIsStartingVideo] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoSupported, setVideoSupported] = useState(true);

  // Gate the video tab on whether the selected provider supports video gen.
  useEffect(() => {
    providerSupports('video').then(setVideoSupported).catch(() => setVideoSupported(false));
  }, [activeSubtab]);

  const handleGenerateImage = async () => {
    setIsGeneratingImage(true);
    try {
      const fullPrompt = `A high quality photorealistic image of a person ${timeline} days after successfully sticking to their life operating system habits: ${imagePrompt}`;
      const data = await aiPost<{ imageUrl?: string }>('/api/generate-image', { prompt: fullPrompt }, 'image');
      if (data.imageUrl) {
        setGeneratedImage(data.imageUrl);
      }
    } catch (e: any) {
      console.error(e);
      if (e instanceof NotConfiguredError) {
        alert('Add your AI provider API key in Settings (top-right) first.');
      }
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedPhoto(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const startVideoPoll = (opName: string) => {
    const poll = setInterval(async () => {
      try {
        const data = await aiPost<{ done?: boolean }>('/api/video-status', { operationName: opName }, 'video');
        if (data.done) {
          clearInterval(poll);
          setIsVideoDone(true);
          // Auto-download when done
          fetchVideo(opName);
        }
      } catch (e) {
        console.error("Polling error", e);
      }
    }, 10000); // Poll every 10 seconds
  };

  const fetchVideo = async (opName: string) => {
    try {
      const s = loadSettings();
      const res = await fetch('/api/video-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operationName: opName, provider: s.provider, model: s.models.video, apiKey: s.apiKey })
      });
      if (!res.ok) throw new Error("Failed to fetch video");
      const blob = await res.blob();
      setVideoUrl(URL.createObjectURL(blob));
    } catch (e: any) {
      console.error(e);
      setVideoError("Error fetching video: " + e.message);
    }
  };

  const handleGenerateVideo = async () => {
    setIsStartingVideo(true);
    setVideoError(null);
    try {
      const data = await aiPost<{ operationName?: string; error?: string }>('/api/generate-video', {
        prompt: videoPrompt,
        image: uploadedPhoto // Base64
      }, 'video');
      if (data.operationName) {
        setVideoOperationName(data.operationName);
        startVideoPoll(data.operationName);
      } else if (data.error) {
        setVideoError(data.error);
      }
    } catch (e: any) {
      console.error(e);
      setVideoError(e instanceof NotConfiguredError ? 'Add your AI provider API key in Settings first.' : e.message);
    } finally {
      setIsStartingVideo(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-semibold text-slate-100 tracking-tight mb-4 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-indigo-400" />
          Envision Your Future
        </h2>
        <p className="text-slate-400 leading-relaxed max-w-3xl">
          Visualizing the outcome of your systems reinforces the identity you are building. See what 30, 60, or 90 days of consistency looks like, or generate a cinematic day-in-the-life video.
        </p>
      </div>

      <div className="flex gap-2 p-1 bg-white/5 rounded-xl max-w-fit">
        <button 
          onClick={() => setActiveSubtab('image')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeSubtab === 'image' ? 'bg-[#0A0A0B] text-slate-200 border border-white/10 shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}
        >
          <ImageIcon className="w-4 h-4" /> Progress Snapshot
        </button>
        <button 
          onClick={() => setActiveSubtab('video')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeSubtab === 'video' ? 'bg-[#0A0A0B] text-slate-200 border border-white/10 shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}
        >
          <Video className="w-4 h-4" /> Day-in-the-Life Video
        </button>
      </div>

      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
        {activeSubtab === 'image' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Time Horizon</label>
              <div className="flex gap-2">
                {['30', '60', '90'].map(t => (
                  <button
                    key={t}
                    onClick={() => setTimeline(t as '30'|'60'|'90')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${timeline === t ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30' : 'bg-[#0A0A0B] text-slate-400 border-white/5 hover:border-white/20'}`}
                  >
                    {t} Days
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Describe Your Future Self</label>
              <textarea 
                value={imagePrompt}
                onChange={e => setImagePrompt(e.target.value)}
                rows={3}
                className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all text-sm resize-none"
              />
            </div>

            <button 
              onClick={handleGenerateImage}
              disabled={isGeneratingImage || !imagePrompt}
              className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:hover:bg-indigo-500 text-white font-medium rounded-xl px-6 py-3 transition-colors flex items-center justify-center gap-2"
            >
              {isGeneratingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
              {isGeneratingImage ? 'Generating Vision...' : 'Generate Vision Snapshot'}
            </button>

            {generatedImage && (
              <div className="mt-8 animate-in fade-in zoom-in duration-500">
                <div className="rounded-xl overflow-hidden border border-white/10 relative group">
                  <img src={generatedImage} alt="Future Vision" className="w-full h-auto object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                    <p className="text-sm text-slate-200 font-medium">Your {timeline}-day vision</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeSubtab === 'video' && !videoSupported && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200/90 text-sm">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              Video generation is only available with the <strong>Google Gemini</strong> provider.
              Open <strong>AI Settings</strong> (top-right) and switch your provider to Gemini to use this feature.
            </div>
          </div>
        )}
        {activeSubtab === 'video' && videoSupported && (
          <div className="space-y-6">
            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 flex gap-3 text-indigo-300 text-sm">
               <Video className="w-5 h-5 flex-shrink-0 mt-0.5" />
               <p>Upload a clear photo of yourself to generate a cinematic, short video showing what a typical day looks like once your systems are fully integrated.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Starting Photo (Required)</label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed ${uploadedPhoto ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-white/10 bg-[#0A0A0B] hover:border-white/20'} rounded-xl p-6 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-3`}
              >
                {uploadedPhoto ? (
                  <div className="relative w-full max-w-[200px] aspect-square rounded-lg overflow-hidden border border-white/10">
                    <img src={uploadedPhoto} alt="Uploaded" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center text-xs font-medium text-white">
                      Change Photo
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                      <Upload className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="text-sm text-slate-400">Click to upload a photo of yourself</div>
                  </>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handlePhotoUpload}
                  accept="image/png, image/jpeg" 
                  className="hidden" 
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Video Prompt</label>
              <textarea 
                value={videoPrompt}
                onChange={e => setVideoPrompt(e.target.value)}
                rows={3}
                className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all text-sm resize-none"
              />
            </div>

            {videoError && (
              <div className="flex items-start gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-sm">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>{videoError}</p>
              </div>
            )}

            <button 
              onClick={handleGenerateVideo}
              disabled={isStartingVideo || !uploadedPhoto || !videoPrompt || !!videoOperationName}
              className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:hover:bg-indigo-500 text-white font-medium rounded-xl px-6 py-3 transition-colors flex items-center justify-center gap-2"
            >
              {isStartingVideo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
              {isStartingVideo ? 'Starting generation...' : videoOperationName ? 'Generation in progress...' : 'Generate Day-in-the-Life Video'}
            </button>

            {videoOperationName && !videoUrl && (
              <div className="mt-8 p-6 bg-[#0A0A0B] border border-white/10 rounded-xl flex flex-col items-center justify-center gap-4 animate-pulse">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-200">Rendering Cinematic Video</p>
                  <p className="text-xs text-slate-500 mt-1">This process usually takes a few minutes. We are animating your photo.</p>
                </div>
              </div>
            )}

            {videoUrl && (
              <div className="mt-8 animate-in fade-in zoom-in duration-500">
                 <div className="rounded-xl overflow-hidden border border-white/10 bg-black">
                   <video 
                     src={videoUrl} 
                     controls 
                     autoPlay 
                     loop
                     className="w-full h-auto max-h-[600px]"
                   />
                 </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
