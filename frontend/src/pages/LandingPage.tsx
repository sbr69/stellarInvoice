import { useWallet } from '@/lib/wallet-context';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Header } from '@/components/header';
import { ArrowRight } from 'lucide-react';

export default function LandingPage() {
  const { isConnected } = useWallet();
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
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-gray-900">
            Web3 Invoicing, <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-teal-500">
              Made Simple.
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Decentralized billing built for the modern economy. Securely register invoices on the Stellar network, share payment links, and verify client transactions in real-time.
          </p>
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
