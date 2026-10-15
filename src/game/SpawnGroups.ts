export class SpawnGroups<T> {
  private readonly groupOf = new Map<T, Set<T>>();
  private readonly open = new Set<Set<T>>();
  private forming: Set<T> | undefined;

  get pending(): number {
    return this.open.size;
  }

  spawn(create: () => void): void {
    const group = new Set<T>();
    this.open.add(group);
    this.forming = group;
    create();
    this.forming = undefined;
    if (group.size === 0) this.open.delete(group);
  }

  join(member: T): void {
    if (!this.forming) return;
    this.forming.add(member);
    this.groupOf.set(member, this.forming);
  }

  leave(member: T): void {
    const group = this.groupOf.get(member);
    if (!group) return;
    this.groupOf.delete(member);
    group.delete(member);
    if (group.size === 0 && group !== this.forming) this.open.delete(group);
  }
}
