/**
 * Keja Tokenize — KYC/AML onboarding modal (4 steps):
 * identity → document → declarations → simulated screening result.
 */
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  User, FileCheck2, ShieldAlert, CheckCircle2, Loader2, ScanFace, BadgeCheck, ArrowRight, ArrowLeft,
} from 'lucide-react'
import { useTokenize } from '@/lib/tokenizeStore'
import { Modal, useToast } from './shared'

const STEPS = ['Identity', 'Document', 'Declarations', 'Screening'] as const

const SOF_OPTIONS = [
  { value: 'SALARIED_PROFESSIONAL', label: 'Salary / professional income' },
  { value: 'BUSINESS_OWNER', label: 'Business ownership' },
  { value: 'SAVINGS', label: 'Personal savings' },
  { value: 'INHERITANCE', label: 'Inheritance' },
  { value: 'INVESTMENT_PROCEEDS', label: 'Proceeds from prior investments' },
  { value: 'DIASPORA_EARNINGS', label: 'Diaspora / offshore earnings' },
]

export function KycModal() {
  const { kycOpen, closeKyc, kycNextAction, completeKyc, investPropertyId, openInvest, setView } = useTokenize()
  const { toast } = useToast()

  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState<{ fullName: string; walletAddress: string } | null>(null)
  const [docCaptured, setDocCaptured] = useState(false)
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    country: 'Kenya',
    idType: 'NATIONAL_ID' as 'NATIONAL_ID' | 'PASSPORT',
    idNumber: '',
    sourceOfFunds: '',
    pepConfirmed: false,
    termsAccepted: false,
  })

  useEffect(() => {
    if (kycOpen) {
      setStep(0)
      setDone(null)
      setDocCaptured(false)
      setSubmitting(false)
    }
  }, [kycOpen])

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }))

  const stepValid = [
    form.fullName.trim().length >= 3 && /.+@.+\..+/.test(form.email) && form.phone.trim().length >= 7,
    docCaptured && form.idNumber.trim().length >= 5,
    !!form.sourceOfFunds && form.pepConfirmed && form.termsAccepted,
  ]

  function submit() {
    setSubmitting(true)
    setStep(3)
    // simulated AML / PEP / sanctions screening
    setTimeout(() => {
      const investor = completeKyc({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        country: form.country.trim() || 'Kenya',
        idType: form.idType,
        idNumber: form.idNumber.trim(),
        sourceOfFunds: form.sourceOfFunds,
      })
      setDone({ fullName: investor.fullName, walletAddress: investor.walletAddress })
      setSubmitting(false)
      toast({
        title: 'KYC approved',
        description: `${investor.fullName} — wallet assigned, you can now invest.`,
      })
    }, 2400)
  }

  function finish() {
    closeKyc()
    if (kycNextAction === 'invest' && investPropertyId) openInvest(investPropertyId)
    else if (kycNextAction === 'portfolio') setView('portfolio')
  }

  return (
    <Modal
      open={kycOpen}
      onClose={() => {
        if (!submitting) closeKyc()
      }}
      title="Investor verification — KYC / AML"
      subtitle="Required once before purchasing tokens. Your data never leaves your browser in this demo."
      icon={<ShieldAlert className="h-5 w-5" />}
    >
      {/* stepper */}
      {!done && (
        <div className="-mx-6 -mt-6 mb-6 flex items-center gap-1 border-b border-gold-100 bg-cream px-6 py-3">
          {STEPS.map((s, i) => (
            <div key={s} className="flex flex-1 items-center gap-1">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                  i < step
                    ? 'bg-emerald-100 text-emerald-700'
                    : i === step
                      ? 'bg-gold-gradient text-white'
                      : 'bg-gold-100 text-gold-700'
                }`}
              >
                {i < step ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className={`hidden text-[11px] font-semibold sm:block ${i === step ? 'text-ink' : 'text-gold-700'}`}>{s}</span>
              {i < STEPS.length - 1 && <div className="h-px flex-1 bg-gold-200" />}
            </div>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* step 1 — identity */}
        {step === 0 && !done && (
          <motion.div key="s1" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
            <div className="space-y-4">
              <div>
                <label htmlFor="kyc-name" className="label-luxe">Full legal name</label>
                <input
                  id="kyc-name"
                  className="input-luxe"
                  placeholder="e.g. Clive Mwangi"
                  value={form.fullName}
                  onChange={(e) => set('fullName', e.target.value)}
                />
              </div>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <div>
                  <label htmlFor="kyc-email" className="label-luxe">Email</label>
                  <input
                    id="kyc-email"
                    type="email"
                    className="input-luxe"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={(e) => set('email', e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="kyc-phone" className="label-luxe">Phone</label>
                  <input
                    id="kyc-phone"
                    className="input-luxe"
                    placeholder="+254 7…"
                    value={form.phone}
                    onChange={(e) => set('phone', e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="kyc-country" className="label-luxe">Country of residence</label>
                <input
                  id="kyc-country"
                  className="input-luxe"
                  value={form.country}
                  onChange={(e) => set('country', e.target.value)}
                />
              </div>
              <button className="btn-gold w-full" disabled={!stepValid[0]} onClick={() => setStep(1)}>
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* step 2 — document */}
        {step === 1 && !done && (
          <motion.div key="s2" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
            <div className="space-y-4">
              <div>
                <span className="label-luxe">Government ID type</span>
                <div className="mt-1.5 grid grid-cols-2 gap-3">
                  {[
                    { v: 'NATIONAL_ID' as const, label: 'Kenyan National ID' },
                    { v: 'PASSPORT' as const, label: 'Passport' },
                  ].map((o) => (
                    <label
                      key={o.v}
                      className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-[13px] font-medium ${
                        form.idType === o.v ? 'border-gold-600 bg-gold-50 text-gold-700' : 'border-gold-100'
                      }`}
                    >
                      <input
                        type="radio"
                        name="idType"
                        className="accent-gold-600"
                        checked={form.idType === o.v}
                        onChange={() => set('idType', o.v)}
                      />
                      {o.label}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor="kyc-idnum" className="label-luxe">
                  {form.idType === 'PASSPORT' ? 'Passport number' : 'National ID number'}
                </label>
                <input
                  id="kyc-idnum"
                  className="input-luxe"
                  placeholder={form.idType === 'PASSPORT' ? 'A01234567' : '12345678'}
                  value={form.idNumber}
                  onChange={(e) => set('idNumber', e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={() => setDocCaptured(true)}
                className={`flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed p-6 transition-colors ${
                  docCaptured ? 'border-emerald-300 bg-emerald-50' : 'border-gold-300 bg-cream hover:bg-gold-50'
                }`}
              >
                {docCaptured ? (
                  <>
                    <BadgeCheck className="h-8 w-8 text-emerald-600" />
                    <span className="text-[13px] font-semibold text-emerald-700">
                      Document captured — OCR extracted 3 security features
                    </span>
                  </>
                ) : (
                  <>
                    <FileCheck2 className="h-8 w-8 text-gold-600" />
                    <span className="text-[13px] font-semibold text-gold-700">Tap to capture ID document</span>
                    <span className="text-[11px] text-ink-muted">
                      Simulated document scan — no file is uploaded in this demo
                    </span>
                  </>
                )}
              </button>
              <div className="flex gap-2">
                <button className="btn-outline flex-1" onClick={() => setStep(0)}>
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <button className="btn-gold flex-[2]" disabled={!stepValid[1]} onClick={() => setStep(2)}>
                  Continue <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* step 3 — declarations */}
        {step === 2 && !done && (
          <motion.div key="s3" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
            <div className="space-y-4">
              <div>
                <label htmlFor="kyc-sof" className="label-luxe">Primary source of funds</label>
                <select
                  id="kyc-sof"
                  className="input-luxe"
                  value={form.sourceOfFunds}
                  onChange={(e) => set('sourceOfFunds', e.target.value)}
                >
                  <option value="">Select an option</option>
                  {SOF_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gold-100 p-3.5">
                <input
                  type="checkbox"
                  className="mt-0.5 accent-gold-600"
                  checked={form.pepConfirmed}
                  onChange={(e) => set('pepConfirmed', e.target.checked)}
                />
                <span className="text-[12.5px] leading-relaxed text-ink-muted">
                  I confirm that I am <strong>not a politically exposed person (PEP)</strong>, and
                  that the funds I will invest are not derived from illicit activity, in line with
                  AML regulations.
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gold-100 p-3.5">
                <input
                  type="checkbox"
                  className="mt-0.5 accent-gold-600"
                  checked={form.termsAccepted}
                  onChange={(e) => set('termsAccepted', e.target.checked)}
                />
                <span className="text-[12.5px] leading-relaxed text-ink-muted">
                  I accept the platform terms, the offering documents framework, and I understand
                  that <strong>tokens are illiquid</strong>, projections are not guaranteed, and
                  this is a <strong>demonstration environment</strong>.
                </span>
              </label>
              <div className="flex gap-2">
                <button className="btn-outline flex-1" onClick={() => setStep(1)}>
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <button className="btn-gold flex-[2]" disabled={!stepValid[2]} onClick={submit}>
                  Submit for screening <ScanFace className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* step 4 — screening / result */}
        {(step === 3 || done) && (
          <motion.div key="s4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {!done ? (
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="relative">
                  <Loader2 className="h-14 w-14 animate-spin text-gold-600" />
                  <ScanFace className="absolute inset-0 m-auto h-6 w-6 text-gold-700" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-ink">Running compliance screening…</p>
                  <div className="mt-3 space-y-1.5 text-[12.5px] text-ink-muted">
                    <p>✓ Document authenticity — 3/3 security features</p>
                    <p>✓ AML watchlist &amp; sanctions screening</p>
                    <p className="animate-pulse rounded px-2 inline-block">PEP database cross-check…</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center">
                <div className="rounded-full bg-emerald-100 p-3">
                  <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                </div>
                <h3 className="mt-4 font-display text-2xl font-bold text-ink">Verification approved</h3>
                <p className="mt-1 text-[13px] text-ink-muted">
                  Welcome, {done.fullName} — your investor wallet is ready.
                </p>
                <div className="mt-4 w-full rounded-xl border border-gold-200 bg-cream p-4 text-left">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="font-semibold text-ink-muted">KYC status</span>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                      VERIFIED
                    </span>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between text-[12px]">
                    <span className="font-semibold text-ink-muted">Assigned wallet</span>
                    <span className="font-mono text-[11px] text-gold-700">
                      {done.walletAddress.slice(0, 12)}…{done.walletAddress.slice(-6)}
                    </span>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between text-[12px]">
                    <span className="font-semibold text-ink-muted">AML / PEP / Sanctions</span>
                    <span className="font-bold text-emerald-700">CLEAR</span>
                  </div>
                </div>
                <button className="btn-gold mt-5 !h-11 w-full" onClick={finish}>
                  {kycNextAction === 'invest' ? 'Continue to investment' : 'Go to my portfolio'}{' '}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-4 flex items-center gap-1.5 text-[11px] text-ink-faint">
        <User className="h-3 w-3" /> Simulated compliance — in production this connects to a licensed KYC/AML provider.
      </div>
    </Modal>
  )
}
