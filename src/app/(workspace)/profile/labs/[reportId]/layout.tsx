export function generateStaticParams() {
  return [
    { reportId: "lab-2026-04" },
    { reportId: "lab-2026-09" },
    { reportId: "lab-demo-upload" },
  ];
}

export default function ReportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
