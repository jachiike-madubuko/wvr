import { RoomStage } from "@/components/room/RoomStage";
import { getRoomSnapshot } from "@/lib/room/data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const room = await getRoomSnapshot();
  return <RoomStage initialRoom={room} />;
}
