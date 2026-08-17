const STATS = [
  { value: '500+', label: 'Verified print shops' },
  { value: '10k+', label: 'Orders delivered' },
  { value: '4.7★', label: 'Average shop rating' },
  { value: '2 hrs', label: 'Fastest turnaround' },
];

export default function TrustStats() {
  return (
    <section className="border-b border-slate-200 bg-white">
      <div className="container-page grid grid-cols-2 gap-6 py-10 sm:py-12 lg:grid-cols-4">
        {STATS.map((stat) => (
          <div key={stat.label} className="text-center">
            <p className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              {stat.value}
            </p>
            <p className="mt-1 text-sm text-slate-500">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
