import { useAuthSession } from "@/hooks/useAuthSession";
import AICommandCenter from "./AICommandCenter";

export default function AICommandCenterGate() {
  const { session, loading } = useAuthSession();
  if (loading || !session?.user?.id) return null;
  return <AICommandCenter />;
}
