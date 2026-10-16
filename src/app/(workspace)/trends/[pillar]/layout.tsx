export function generateStaticParams() {
  return [
    { pillar: "sleep" },
    { pillar: "recovery" },
    { pillar: "nutrition" },
    { pillar: "activity" },
    { pillar: "labs" },
  ];
}

export default function PillarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
