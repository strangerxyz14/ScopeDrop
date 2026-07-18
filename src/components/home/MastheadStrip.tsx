import { useHomeStats } from "@/hooks/home/useHomeStats";

export function MastheadStrip() {
  const { data, isLoading } = useHomeStats();
  const rounds = data?.roundsThisQuarter ?? 0;
  const companies = data?.companiesTracked ?? 0;

  const rightParts: string[] = [];
  if (rounds > 0) rightParts.push(`${rounds.toLocaleString()} ROUNDS THIS QUARTER`);
  if (companies > 0) rightParts.push(`${companies.toLocaleString()} COMPANIES TRACKED`);

  return (
    <div className="masthead">
      <div className="wrap mh">
        <div className="l">
          <span>THE PULSE OF WHAT'S BUILDING</span>
        </div>
        {!isLoading && rightParts.length > 0 && (
          <div className="r">
            <span className="pd" aria-hidden="true"></span>
            {rightParts.join(" · ")}
          </div>
        )}
      </div>
    </div>
  );
}
