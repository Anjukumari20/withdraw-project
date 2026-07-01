"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

// Reads payment details from the URL, e.g.:
// /payment-success?amount=400&upi=anju@ybl&ref=1509879247
export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();

  const amount = searchParams.get("amount") || "";
  const upi = searchParams.get("upi") || "";
  const ref = searchParams.get("ref") || "";
  const date = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="wrap">
      <div className="card">
        <div className="icon">
          <svg viewBox="0 0 52 52" width="52" height="52">
            <circle cx="26" cy="26" r="25" fill="none" stroke="currentColor" strokeWidth="2" />
            <path
              fill="none"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 27l7 7 15-15"
            />
          </svg>
        </div>

        <p className="eyebrow">WITHDRAWAL COMPLETE</p>
        <h1>Payment sent</h1>

        {amount && (
          <div className="amount">
            {Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            <span className="unit">USDT</span>
          </div>
        )}

        <div className="details">
          {upi && (
            <div className="row">
              <span className="label">UPI ID</span>
              <span className="value">{upi}</span>
            </div>
          )}
          {ref && (
            <div className="row">
              <span className="label">Reference</span>
              <span className="value mono">{ref}</span>
            </div>
          )}
          <div className="row">
            <span className="label">Confirmed</span>
            <span className="value">{date}</span>
          </div>
        </div>

        <Link href="/" className="cta">
          Back to dashboard
        </Link>
      </div>

      <style jsx>{`
        .wrap {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0d100c;
          padding: 24px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }

        .card {
          width: 100%;
          max-width: 440px;
          background: #14180f;
          border: 1px solid #262b21;
          border-radius: 16px;
          padding: 48px 36px 36px;
          text-align: center;
        }

        .icon {
          width: 72px;
          height: 72px;
          margin: 0 auto 24px;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(74, 222, 128, 0.08);
          color: #4ade80;
        }

        .eyebrow {
          margin: 0 0 8px;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.12em;
          color: #e0ac54;
        }

        h1 {
          margin: 0 0 28px;
          font-size: 24px;
          font-weight: 600;
          color: #f5f3ee;
        }

        .amount {
          font-size: 40px;
          font-weight: 700;
          color: #f5f3ee;
          margin-bottom: 28px;
          letter-spacing: -0.01em;
        }

        .unit {
          font-size: 16px;
          font-weight: 500;
          color: #8b9186;
          margin-left: 8px;
        }

        .details {
          border-top: 1px solid #262b21;
          border-bottom: 1px solid #262b21;
          padding: 18px 0;
          margin-bottom: 28px;
          text-align: left;
        }

        .row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
        }

        .label {
          font-size: 13px;
          color: #8b9186;
        }

        .value {
          font-size: 14px;
          color: #f5f3ee;
          font-weight: 500;
        }

        .value.mono {
          font-family: "SF Mono", ui-monospace, Menlo, monospace;
          letter-spacing: 0.02em;
        }

        .cta {
          display: inline-block;
          width: 100%;
          padding: 14px 0;
          background: #e0ac54;
          color: #14180f;
          font-weight: 600;
          font-size: 15px;
          text-decoration: none;
          border-radius: 10px;
          transition: opacity 0.15s ease;
        }

        .cta:hover {
          opacity: 0.9;
        }
      `}</style>
    </div>
  );
}