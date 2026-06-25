import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/i18n";

export interface TeamStanding {
  id: string;
  name: string;
  flag: string;
  mp: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
}

export function StandingsTable({ standings }: { standings: TeamStanding[] }) {
  const { t } = useLang();
  return (
    <Card className="overflow-hidden border-border bg-card">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="w-12 text-center font-bold text-foreground">#</TableHead>
              <TableHead className="font-bold text-foreground">{t.team}</TableHead>
              <TableHead className="text-center w-12 font-medium">MP</TableHead>
              <TableHead className="text-center w-10 font-medium">W</TableHead>
              <TableHead className="text-center w-10 font-medium">D</TableHead>
              <TableHead className="text-center w-10 font-medium">L</TableHead>
              <TableHead className="text-center w-10 font-medium hidden sm:table-cell">GF</TableHead>
              <TableHead className="text-center w-10 font-medium hidden sm:table-cell">GA</TableHead>
              <TableHead className="text-center w-10 font-medium hidden sm:table-cell">GD</TableHead>
              <TableHead className="text-center w-12 font-bold text-foreground">{t.pts}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {standings.map((team, index) => {
              const position    = index + 1;
              const isQualified = position <= 2;
              const isThirdPlace = position === 3;
              return (
                <TableRow
                  key={team.id}
                  className={cn(
                    "border-border/50",
                    isQualified   ? "bg-primary/5 hover:bg-primary/10"     : "",
                    isThirdPlace  ? "bg-amber-500/5 hover:bg-amber-500/10" : ""
                  )}
                >
                  <TableCell className="text-center font-medium">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center mx-auto text-xs font-bold",
                      isQualified   ? "bg-primary text-primary-foreground" :
                      isThirdPlace  ? "bg-amber-500 text-white"            : "bg-muted text-muted-foreground"
                    )}>
                      {position}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-4 rounded-sm overflow-hidden bg-muted flex-shrink-0">
                        {team.flag && <img src={team.flag} alt={team.name} className="w-full h-full object-cover" />}
                      </div>
                      <span className="font-semibold whitespace-nowrap">{team.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{team.mp}</TableCell>
                  <TableCell className="text-center">{team.w}</TableCell>
                  <TableCell className="text-center">{team.d}</TableCell>
                  <TableCell className="text-center">{team.l}</TableCell>
                  <TableCell className="text-center hidden sm:table-cell text-muted-foreground">{team.gf}</TableCell>
                  <TableCell className="text-center hidden sm:table-cell text-muted-foreground">{team.ga}</TableCell>
                  <TableCell className="text-center hidden sm:table-cell font-medium">
                    {team.gd > 0 ? `+${team.gd}` : team.gd}
                  </TableCell>
                  <TableCell className="text-center font-bold text-base">{team.pts}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
