import { IconSearch, IconTruck, IconUpload } from '@/components/icons';

const STEPS = [
  {
    icon: IconSearch,
    title: 'Find a shop',
    description:
      'Search by location and service. Compare shops on rating, distance, turnaround time and price.',
  },
  {
    icon: IconUpload,
    title: 'Upload & customise',
    description:
      'Send your files, pick paper type, size, colour and finishing. See the exact cost before you pay.',
  },
  {
    icon: IconTruck,
    title: 'Track & collect',
    description:
      'Follow your order live from press to doorstep, or choose store pickup and skip the wait.',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 bg-slate-50 py-16 sm:py-20">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Printing in three simple steps
          </h2>
          <p className="mt-3 text-slate-600">
            No phone calls, no waiting in queues, no surprise pricing at the counter.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <div key={step.title} className="card relative p-6">
              <span className="absolute right-5 top-5 text-5xl font-black text-slate-100">
                {index + 1}
              </span>
              <span className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <step.icon className="h-6 w-6" />
              </span>
              <h3 className="relative mt-4 text-lg font-semibold text-slate-900">{step.title}</h3>
              <p className="relative mt-2 text-sm leading-relaxed text-slate-600">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
