"use client";
// @ts-nocheck
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useSupabaseAuth } from '@/context/SupabaseAuthContext';
import {
  Eye,
  Brain,
  Ship,
  Scale,
  Zap,
  Cloud,
  Globe,
  TrendingUp,
  Check,
  X,
  Play,
  ArrowRight,
  DollarSign,
  Clock,
  AlertTriangle,
  Anchor,
} from 'lucide-react';
import { BRAND, PlimsollMark } from '@/components/Brand';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/landing/Navbar';
import '@/styles/payment.css';

// Feature Card Component
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: number;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description, delay }) => (
  <motion.div
    className="feature-card"
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay }}
  >
    <div className="feature-icon">{icon}</div>
    <h3 className="feature-title">{title}</h3>
    <p className="feature-description">{description}</p>
  </motion.div>
);

// Use Case Card Component
interface UseCaseCardProps {
  icon: React.ReactNode;
  title: string;
  scenario: string;
  outcome: string;
  delay: number;
}

const UseCaseCard: React.FC<UseCaseCardProps> = ({ icon, title, scenario, outcome, delay }) => (
  <motion.div
    className="usecase-card"
    initial={{ opacity: 0, x: -20 }}
    whileInView={{ opacity: 1, x: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay }}
  >
    <div className="usecase-icon">{icon}</div>
    <div className="usecase-content">
      <h3 className="usecase-title">{title}</h3>
      <p className="usecase-scenario">{scenario}</p>
      <div className="usecase-outcome">
        <Check className="w-4 h-4 text-[#16A34A]" />
        <span>{outcome}</span>
      </div>
    </div>
  </motion.div>
);

// Pricing Tier Component
interface PricingTierProps {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  ctaText: string;
  onSelect: () => void;
  delay: number;
}

const PricingTier: React.FC<PricingTierProps> = ({
  name,
  price,
  period,
  description,
  features,
  highlighted,
  ctaText,
  onSelect,
  delay,
}) => (
  <motion.div
    className={`pricing-card ${highlighted ? 'pricing-card-highlighted' : ''}`}
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay }}
  >
    {highlighted && <div className="pricing-badge">Most Popular</div>}
    <h3 className="pricing-name">{name}</h3>
    <div className="pricing-price">
      <span className="pricing-amount">{price}</span>
      {period && <span className="pricing-period">{period}</span>}
    </div>
    <p className="pricing-description">{description}</p>
    <ul className="pricing-features">
      {features.map((feature, index) => (
        <li key={index} className="pricing-feature">
          <Check className="w-4 h-4 text-[#16A34A]" />
          <span>{feature}</span>
        </li>
      ))}
    </ul>
    <button className={`pricing-cta ${highlighted ? 'pricing-cta-primary' : ''}`} onClick={onSelect}>
      {ctaText}
    </button>
  </motion.div>
);

// Payment Modal Component
interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTier: string;
  onProceedToDemo: () => void;
  onSignIn: (e?: React.MouseEvent) => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, selectedTier, onProceedToDemo, onSignIn }) => {
  const { isSignedIn } = useSupabaseAuth();
  
  if (!isOpen) return null;

  return (
    <motion.div
      className="payment-modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="payment-modal"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
      >
        <button className="payment-modal-close" onClick={onClose}>
          <X className="w-5 h-5" />
        </button>

        <div className="payment-modal-header">
          <div className="payment-modal-icon">
            <PlimsollMark size={36} />
          </div>
          <h2>Welcome to {BRAND.short} {selectedTier}</h2>
          <p>Maritime risk &amp; compliance, replayable end-to-end.</p>
        </div>

        <div className="payment-modal-body">
          <div className="payment-demo-notice">
              <Zap className="w-5 h-5 text-[#2563EB]" />
            <div>
              <h4>Demo Mode Active</h4>
              <p>This is a demonstration. No payment will be processed.</p>
            </div>
          </div>

          <div className="payment-benefits">
            <div className="payment-benefit">
              <Check className="w-4 h-4 text-[#16A34A]" />
              <span>Full access to crisis simulation</span>
            </div>
            <div className="payment-benefit">
              <Check className="w-4 h-4 text-[#16A34A]" />
              <span>Multi-agent AI decision making</span>
            </div>
            <div className="payment-benefit">
              <Check className="w-4 h-4 text-[#16A34A]" />
              <span>Real-time route optimization</span>
            </div>
          </div>
        </div>

        <div className="payment-modal-footer">
          <button className="payment-btn-secondary" onClick={(e) => {
              console.log("[PaymentModal] Action button clicked, isSignedIn:", isSignedIn);
              onSignIn(e);
          }}>
            {isSignedIn ? "Go to Dashboard" : "Sign In Now"}
          </button>
          <button className="payment-btn-primary" onClick={onProceedToDemo}>
            <Play className="w-4 h-4" />
            Enter Demo
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Main Landing Page Component
export const LandingPage: React.FC = () => {
  const router = useRouter();
  const { isSignedIn } = useSupabaseAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState('Pro');

  const handleTierSelect = (tier: string) => {
    setSelectedTier(tier);
    setIsModalOpen(true);
  };

  const handleProceedToDemo = () => {
    setIsModalOpen(false);
    router.push('/port');
  };

  const handleSignIn = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    setIsModalOpen(false);

    if (isSignedIn) {
      console.warn("[PaymentPage] User already signed in. Navigating to /port");
      setTimeout(() => router.push('/port'), 0);
    } else {
      console.warn("[PaymentPage] User not signed in. Navigating to /sign-in");
      setTimeout(() => router.push('/sign-in'), 0);
    }
  };

  const features = [
    {
      icon: <Eye className="w-6 h-6" />,
      title: 'Visual Risk Intelligence',
      description: 'Gemini Vision analyzes satellite imagery to detect port congestion, canal blockages, and container pile-ups in real-time.',
    },
    {
      icon: <Brain className="w-6 h-6" />,
      title: 'Multi-Agent Reasoning Engine',
      description: '5 specialized AI agents collaborate: Market Sentinel, Compliance Manager, Risk Hedger, Route Optimizer, and Crisis Coordinator.',
    },
    {
      icon: <Scale className="w-6 h-6" />,
      title: 'Long Document Compliance',
      description: 'Analyze 500-page insurance policies and sanction lists using Gemini\'s 2M token context window for instant compliance verification.',
    },
    {
      icon: <Ship className="w-6 h-6" />,
      title: 'Dynamic Cost Calculation',
      description: 'Automatically calculate rerouting fuel costs, freight rate changes, and total financial impact before making decisions.',
    },
  ];

  const useCases = [
    {
      icon: <AlertTriangle className="w-6 h-6 text-[#DC2626]" />,
      title: 'Red Sea Crisis (Maersk Scenario)',
      scenario: 'Houthi attacks disrupt Red Sea shipping. Traditional analysis: 3+ days.',
      outcome: 'AI recommends Cape reroute in 3 min, calculates +$180K fuel cost vs $2.3M cargo risk',
    },
    {
      icon: <Cloud className="w-6 h-6 text-[#2563EB]" />,
      title: 'Critical Material Tracking (Tesla Scenario)',
      scenario: 'Cobalt shipment from DRC faces port worker strike. EV battery production at risk.',
      outcome: 'Gemini Vision detects container backlog from satellite, triggers alternate supplier protocol',
    },
    {
      icon: <Anchor className="w-6 h-6 text-[#16A34A]" />,
      title: 'Suez Canal Blockage (Ever Given Type)',
      scenario: 'Satellite imagery shows unusual vessel clustering at canal entrance.',
      outcome: 'Early warning 6 hours before official announcement, proactive fleet diversion',
    },
  ];

  const pricingTiers = [
    {
      name: 'Growth',
      price: '$4,999',
      period: '/month',
      description: 'For regional logistics providers (Flexport-level)',
      features: [
        '50 shipping routes monitoring',
        'Gemini-powered risk alerts',
        'Compliance document analysis',
        'Trade sanction screening',
        'Priority support',
      ],
      ctaText: 'Start Growth Plan',
    },
    {
      name: 'Enterprise',
      price: '$19,999',
      period: '/month',
      description: 'For Global 500 (Maersk, Tesla, Apple)',
      features: [
        'Unlimited route monitoring',
        'Visual Risk satellite analysis',
        '5-agent reasoning engine',
        'Real-time financial hedging',
        'Dedicated NOC integration',
        '24/7 SLA guarantee',
      ],
      highlighted: true,
      ctaText: 'Start Enterprise Trial',
    },
    {
      name: 'Strategic',
      price: 'Custom',
      description: 'For commodity traders (Cargill, Glencore)',
      features: [
        'Private cloud deployment',
        'Bloomberg/MarineTraffic API integration',
        'Custom AI agent training',
        'Geopolitical intelligence feed',
        'Board-level reporting',
        'Unlimited global coverage',
      ],
      ctaText: 'Contact Sales',
    },
  ];

  return (
    <div className="payment-page">
      <Navbar />
      {/* Background Effects */}
      <div className="payment-bg-gradient" />
      <div className="payment-grid-bg" />

      {/* Hero Section — supermemory-style: oversized headline,
          serif italic accent on one word, single gradient CTA. */}
      <section
        className="relative isolate overflow-hidden px-6 pt-28 pb-24 md:pt-36 md:pb-32"
        style={{ minHeight: 'min(880px, 100vh)' }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -top-1/3 left-1/2 -translate-x-1/2 size-[1100px] glow-conic opacity-60"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[520px] glow-accent"
        />

        <motion.div
          className="relative z-10 mx-auto flex max-w-[980px] flex-col items-center text-center"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[rgba(255,255,255,0.04)] px-3 py-1 text-[11px] font-mono uppercase tracking-[0.16em] text-[var(--text-mid)]">
            <span className="size-1.5 rounded-full bg-[var(--accent-1)]" />
            {BRAND.long} &middot; v1.0 base release
          </div>

          <h1 className="m-0 max-w-[14ch] text-[clamp(3rem,7vw,6rem)] font-semibold leading-[1.02] tracking-[-0.045em] text-[var(--text-hi)]">
            The maritime{' '}
            <span className="accent-serif text-grad-accent">cockpit</span> for
            risk, compliance, and hedging.
          </h1>

          <p className="mt-7 max-w-[64ch] text-[17px] leading-[1.6] text-[var(--text-mid)]">
            Connect your fleet, paste your route, drop your certificates &mdash;
            and get a <span className="text-[var(--text-hi)]">regulator-grade compliance verdict</span>,
            a vessel-by-vessel <span className="text-[var(--text-hi)]">risk map</span>,
            and a <span className="text-[var(--text-hi)]">hedge plan</span> in real time.
            Every output is cited. Every agent run is replayable.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Button
              variant="gradient"
              size="xl"
              onClick={() => handleTierSelect('Enterprise')}
            >
              <Zap className="size-4" />
              Start free trial
              <ArrowRight className="size-4" />
            </Button>
            <Button variant="outline" size="xl" onClick={() => router.push('/port')}>
              <Play className="size-4" />
              Run the live demo
            </Button>
          </div>

          <div className="mt-12 grid w-full grid-cols-1 gap-3 text-left sm:grid-cols-3 sm:gap-2">
            {[
              { icon: <Globe className="size-4" />, label: 'IMO, PSC, ECA, customs &mdash; cited' },
              { icon: <Clock className="size-4" />, label: 'Decision in &lt; 3 minutes, not 3 days' },
              { icon: <Scale className="size-4" />, label: 'Audit-grade, replayable agent traces' },
            ].map((b, i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 rounded-full border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-4 py-2 text-[12.5px] text-[var(--text-mid)]"
              >
                <span className="text-[var(--accent-1)]">{b.icon}</span>
                <span dangerouslySetInnerHTML={{ __html: b.label }} />
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <motion.div
          className="section-header"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="section-title">Enterprise-Grade AI Capabilities</h2>
          <p className="section-subtitle">
            Powered by 5 specialized AI agents working together to protect your supply chain
          </p>
        </motion.div>

        <div className="features-grid">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              delay={index * 0.1}
            />
          ))}
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="usecases-section">
        <motion.div
          className="section-header"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="section-title">Real-World Crisis Response</h2>
          <p className="section-subtitle">
            See how Plimsoll turns reactive firefighting into proactive protection
          </p>
        </motion.div>

        <div className="usecases-list">
          {useCases.map((useCase, index) => (
            <UseCaseCard
              key={index}
              icon={useCase.icon}
              title={useCase.title}
              scenario={useCase.scenario}
              outcome={useCase.outcome}
              delay={index * 0.15}
            />
          ))}
        </div>
      </section>

      {/* ROI Section */}
      <section className="roi-section">
        <motion.div
          className="roi-container"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="roi-header">
            <TrendingUp className="w-8 h-8 text-[#16A34A]" />
            <h2>Return on Investment</h2>
          </div>

          <div className="roi-comparison">
            <div className="roi-invest">
              <span className="roi-label">Your Investment</span>
              <div className="roi-value invest">
                <DollarSign className="w-6 h-6" />
                <span>2,870</span>
                <span className="roi-period">/year</span>
              </div>
            </div>

            <div className="roi-arrow">
              <ArrowRight className="w-8 h-8" />
            </div>

            <div className="roi-return">
              <span className="roi-label">Average Savings</span>
              <div className="roi-value return">
                <DollarSign className="w-6 h-6" />
                <span>50,000+</span>
                <span className="roi-period">/year</span>
              </div>
            </div>
          </div>

          <div className="roi-highlight">
            <span className="roi-multiplier">17x</span>
            <span className="roi-text">Return on Investment</span>
          </div>

          <p className="roi-footnote">
            Based on average client savings from avoided delays, rerouting costs, and cargo protection.
            Enterprise clients with $10M+ annual shipping spend see even higher returns.
          </p>
        </motion.div>
      </section>

      {/* Pricing Section */}
      <section className="pricing-section">
        <motion.div
          className="section-header"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="section-title">Simple, Transparent Pricing</h2>
          <p className="section-subtitle">
            Start free, scale as you grow. No hidden fees.
          </p>
        </motion.div>

        <div className="pricing-grid">
          {pricingTiers.map((tier, index) => (
            <PricingTier
              key={index}
              {...tier}
              onSelect={() => handleTierSelect(tier.name)}
              delay={index * 0.1}
            />
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <motion.div
          className="cta-container"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="cta-title">Securing the Lifelines of Global Economy</h2>
          <p className="cta-subtitle">
            When Plimsoll helps Maersk reroute during a Red Sea crisis, it means Kenya's grain won't run out, 
            Europe's gas supply stays secure, and critical medical equipment reaches hospitals on time.
          </p>
          <div className="cta-buttons">
            <button className="cta-btn-primary" onClick={() => handleTierSelect('Enterprise')}>
              <Zap className="w-5 h-5" />
              Start Free Trial
            </button>
            <button className="cta-btn-secondary" onClick={() => router.push('/port')}>
              <Play className="w-5 h-5" />
              Try Live Demo
            </button>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="payment-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <PlimsollMark size={22} />
            <span>{BRAND.short}</span>
          </div>
          <p className="footer-tagline">{BRAND.tagline}</p>
          <p className="footer-copyright">
            &copy; 2026 {BRAND.long}. Maritime supply-chain risk &amp; compliance.
          </p>
        </div>
      </footer>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedTier={selectedTier}
        onProceedToDemo={handleProceedToDemo}
        onSignIn={handleSignIn}
      />
    </div>
  );
};

export default LandingPage;
