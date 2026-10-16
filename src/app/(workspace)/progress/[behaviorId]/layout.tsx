import { BEHAVIOR_LIBRARY } from "@/lib/behaviors";

export function generateStaticParams() {
  return BEHAVIOR_LIBRARY.map((item) => ({ behaviorId: item.id }));
}

export default function BehaviorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
