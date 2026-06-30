import { useWallet } from '@/lib/wallet-context';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Header } from '@/components/header';
import { Wallet, ShieldCheck, Zap, Link as LinkIcon, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  const { isConnected, connectWallet } = useWallet();
  const navigate = useNavigate();

  useEffect(() => {
    if (isConnected) {
      navigate('/dashboard');
    }
  }, [isConnected, navigate]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-50 text-violet-700 text-sm font-medium border border-violet-100">
            <span className="flex h-2 w-2 rounded-full bg-violet-500"></span>
            Stellar Network Integration
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-gray-900">
            Web3 Invoicing, <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-teal-500">
              Made Simple.
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Create, share, and get paid instantly. No passwords, no borders, just connect your Stellar wallet and start billing your clients in seconds.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={connectWallet}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-8 py-3.5 rounded-full font-medium text-lg transition-all shadow-lg shadow-gray-900/20 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
            >
              <Wallet className="w-5 h-5" />
              Connect Wallet to Start
            </button>
            <a 
              href="#how-it-works"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-gray-700 hover:text-gray-900 border border-gray-200 px-8 py-3.5 rounded-full font-medium text-lg transition-all hover:bg-gray-50"
            >
              Learn More
            </a>
          </div>
        </div>

        {/* Feature Grid */}
        <div id="how-it-works" className="max-w-5xl mx-auto grid sm:grid-cols-3 gap-8 mt-32">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center mb-6">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Passwords</h3>
            <p className="text-gray-600 leading-relaxed">Your identity is your wallet. Connect instantly without the hassle of email sign-ups or forgotten passwords.</p>
          </div>
          
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center mb-6">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Instant Verification</h3>
            <p className="text-gray-600 leading-relaxed">Payments are verified on-chain in real-time. No more waiting days for bank transfers to clear.</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-6">
              <LinkIcon className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Shareable Links</h3>
            <p className="text-gray-600 leading-relaxed">Generate a clean, professional public invoice page that your clients can pay with a single click.</p>
          </div>
        </div>

        {/* 3 Step Flow */}
        <div className="max-w-5xl mx-auto w-full mt-32 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 mb-12">How it works</h2>
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-4 relative">
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-gray-100 -z-10"></div>
            
            <div className="flex-1 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative w-full max-w-sm mx-auto">
              <div className="w-8 h-8 rounded-full bg-gray-900 text-white font-bold flex items-center justify-center absolute -top-4 left-1/2 -translate-x-1/2">1</div>
              <h4 className="font-semibold text-gray-900 mt-4 mb-2">Create</h4>
              <p className="text-sm text-gray-500">Draft a professional invoice with line items in our clean wizard.</p>
            </div>
            
            <ArrowRight className="text-gray-300 hidden md:block w-8 h-8 shrink-0" />
            
            <div className="flex-1 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative w-full max-w-sm mx-auto">
              <div className="w-8 h-8 rounded-full bg-gray-900 text-white font-bold flex items-center justify-center absolute -top-4 left-1/2 -translate-x-1/2">2</div>
              <h4 className="font-semibold text-gray-900 mt-4 mb-2">Share</h4>
              <p className="text-sm text-gray-500">Send the unique public link to your client via email or chat.</p>
            </div>

            <ArrowRight className="text-gray-300 hidden md:block w-8 h-8 shrink-0" />
            
            <div className="flex-1 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative w-full max-w-sm mx-auto border-violet-100">
              <div className="w-8 h-8 rounded-full bg-violet-600 text-white font-bold flex items-center justify-center absolute -top-4 left-1/2 -translate-x-1/2">3</div>
              <h4 className="font-semibold text-gray-900 mt-4 mb-2">Get Paid</h4>
              <p className="text-sm text-gray-500">Client pays via Freighter. Status updates automatically.</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="py-8 text-center text-gray-400 text-sm border-t border-gray-100 bg-white">
        &copy; {new Date().getFullYear()} InvoiceChain. Web3 SaaS Invoicing on Stellar.
      </footer>
    </div>
  );
}
