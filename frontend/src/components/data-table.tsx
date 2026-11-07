import { useState } from "react";
import {
  createSortedRowModel,
  FlexRender,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_datetime,
  tableFeatures,
  useTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, datetime: sortFn_datetime },
});

export function DataTable<T extends object>({
  data, columns, onRowClick, rowId, empty, testId,
}: {
  data: T[];
  columns: ColumnDef<typeof features, T>[];
  onRowClick?: (row: T) => void;
  rowId?: (row: T) => string;
  empty?: React.ReactNode;
  testId?: string;
}) {
  const [sorting, setSorting] = useState<{ id: string; desc: boolean }[]>([]);
  const table = useTable({
    features,
    columns,
    data,
    getRowId: rowId,
    state: { sorting },
    onSortingChange: setSorting,
  });
  const rows = table.getRowModel().rows;
  if (!rows.length) return <>{empty}</>;
  return (
    <div className="overflow-x-auto" data-testid={testId}>
      <table className="w-full border-separate border-spacing-0 text-sm">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => {
                const sorted = h.column.getIsSorted();
                const canSort = h.column.getCanSort();
                return (
                  <th key={h.id} className="sticky top-0 border-b border-white/10 bg-card/95 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted backdrop-blur">
                    {h.isPlaceholder ? null : canSort ? (
                      <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={h.column.getToggleSortingHandler()}>
                        <FlexRender header={h} />
                        {sorted === "asc" ? <ArrowUp className="h-3 w-3" /> : sorted === "desc" ? <ArrowDown className="h-3 w-3" /> : <ChevronsUpDown className="h-3 w-3 opacity-40" />}
                      </button>
                    ) : (
                      <FlexRender header={h} />
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              onClick={onRowClick ? () => onRowClick(row.original) : undefined}
              className={cn("transition-colors", onRowClick && "cursor-pointer hover:bg-white/[0.04]")}
              data-testid="table-row"
            >
              {row.getAllCells().map((cell) => (
                <td key={cell.id} className="border-b border-white/[0.05] px-4 py-3 align-middle">
                  <FlexRender cell={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
