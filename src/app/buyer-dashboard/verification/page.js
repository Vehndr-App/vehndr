"use client";

export default function VerificationPage() {
  const items = [
    { label: "Government ID", desc: "Verify your identity with a passport or driver's license.", icon: "🪪", status: "pending" },
    { label: "Business License", desc: "Upload your business registration or LLC documentation.", icon: "📄", status: "pending" },
    { label: "Event Insurance", desc: "Provide proof of general liability insurance.", icon: "🛡️", status: "pending" },
    { label: "Tax Information", desc: "Submit your W-9 or tax identification number.", icon: "🧾", status: "pending" },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-xl font-display font-bold text-[var(--gray-900)]">Verification Centre</h1>
        <p className="text-sm text-[var(--gray-500)] mt-1">
          Complete verification to unlock higher booking limits and build vendor trust.
        </p>
      </div>

      {/* Coming soon banner */}
      <div
        className="rounded-2xl p-6 mb-8 flex items-start gap-4"
        style={{ background: "var(--gradient-browse)", border: "1px solid var(--violet-100)" }}
      >
        <div className="w-10 h-10 rounded-xl bg-white/80 flex items-center justify-center flex-shrink-0 text-xl">
          🔜
        </div>
        <div>
          <p className="font-semibold text-[var(--violet-800)]">Coming Soon</p>
          <p className="text-sm text-[var(--violet-700)] mt-0.5 leading-relaxed">
            Verification Centre is under development. You will be notified when it is live and can complete your profile verification.
          </p>
        </div>
      </div>

      {/* Preview cards */}
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="bg-white rounded-2xl p-5 flex items-center gap-4 opacity-60"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <div className="w-12 h-12 rounded-xl bg-[var(--gray-50)] flex items-center justify-center text-2xl flex-shrink-0">
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-[var(--gray-900)]">{item.label}</p>
              <p className="text-xs text-[var(--gray-500)] mt-0.5">{item.desc}</p>
            </div>
            <span className="text-xs font-medium text-[var(--gray-300)] bg-[var(--gray-100)] px-3 py-1 rounded-full flex-shrink-0">
              Not started
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
