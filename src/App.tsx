import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import WhatsAppFloat from '@/components/layout/WhatsAppFloat'
import AuthModal from '@/components/auth/AuthModal'
import Home from '@/pages/Home'
import Properties from '@/pages/Properties'
import PropertyDetail from '@/pages/PropertyDetail'
import AskKeja from '@/pages/AskKeja'
import TrustCenter from '@/pages/TrustCenter'
import About from '@/pages/About'
import Contact from '@/pages/Contact'
import Insights from '@/pages/Insights'
import ListProperty from '@/pages/ListProperty'
import Manage from '@/pages/Manage'
import Account from '@/pages/Account'
import Ecosystem from '@/pages/Ecosystem'

const InvestmentCalculator = lazy(() => import('@/pages/InvestmentCalculator'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Tokenize = lazy(() => import('@/pages/Tokenize'))
const Admin = lazy(() => import('@/pages/Admin'))
const Partners = lazy(() => import('@/pages/Partners'))

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname])
  return null
}

function LazyFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <span className="h-10 w-10 animate-spin rounded-full border-4 border-gold-100 border-t-gold-600" />
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Loading…</p>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <ScrollToTop />
      <Navbar />
      <main className="flex-1 pt-16">
        <Suspense fallback={<LazyFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/properties" element={<Properties />} />
            <Route path="/properties/:id" element={<PropertyDetail />} />
            <Route path="/ask" element={<AskKeja />} />
            <Route path="/invest" element={<InvestmentCalculator />} />
            <Route path="/tokenize" element={<Tokenize />} />
            <Route path="/trust" element={<TrustCenter />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/sell" element={<ListProperty />} />
            <Route path="/manage" element={<Manage />} />
            <Route path="/account" element={<Account />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/ecosystem" element={<Ecosystem />} />
            <Route path="/partners" element={<Partners />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
      <WhatsAppFloat />
      <AuthModal />
    </div>
  )
}
