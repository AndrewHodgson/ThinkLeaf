import type { CanvasObject, SidebarItemColor } from "@/types/workspace";
import { getCanvasObjectsBounds } from "@/components/workspace/canvas/canvasGeometry";

export const defaultCanvasGroupColor: SidebarItemColor = "green";

export type CanvasGroupFrame = {
  bounds: {
    height: number;
    width: number;
    x: number;
    y: number;
  };
  id: string;
  label: string;
  memberIds: string[];
  color: SidebarItemColor;
};

export function getCanvasGroupFrames(objects: CanvasObject[], padding = 12): CanvasGroupFrame[] {
  const membersByGroup = new Map<string, CanvasObject[]>();

  for (const object of objects) {
    if (!object.groupId || object.type === "group") {
      continue;
    }

    membersByGroup.set(object.groupId, [...(membersByGroup.get(object.groupId) ?? []), object]);
  }

  return Array.from(membersByGroup.entries()).flatMap(([id, members]) => {
    if (members.length < 2) {
      return [];
    }

    const bounds = getCanvasObjectsBounds(members, objects, padding);
    if (!bounds) {
      return [];
    }

    return [
      {
        bounds,
        id,
        label: getCanvasGroupLabel(members),
        memberIds: members.map((member) => member.id),
        color: getCanvasGroupColor(members),
      },
    ];
  });
}

export function getCanvasGroupLabel(objects: CanvasObject[], groupId?: string) {
  const members = groupId ? objects.filter((object) => object.groupId === groupId) : objects;
  const label = members.find((object) => object.groupLabel?.trim())?.groupLabel?.trim();
  return label || "Group";
}

export function getCanvasGroupColor(objects: CanvasObject[], groupId?: string): SidebarItemColor {
  const members = groupId ? objects.filter((object) => object.groupId === groupId) : objects;
  return members.find((object) => object.groupColor)?.groupColor ?? defaultCanvasGroupColor;
}

export function normalizeCanvasGroupMemberships(objects: CanvasObject[]) {
  const groupCounts = new Map<string, number>();

  for (const object of objects) {
    if (object.groupId && object.type !== "group") {
      groupCounts.set(object.groupId, (groupCounts.get(object.groupId) ?? 0) + 1);
    }
  }

  return objects.map((object) => {
    if (!object.groupId || (groupCounts.get(object.groupId) ?? 0) >= 2) {
      return object;
    }

    const { groupColor, groupId, groupLabel, ...ungroupedObject } = object;
    return ungroupedObject;
  });
}
