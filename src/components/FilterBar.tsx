
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FundingStage, NewsType, Region, Sector } from "@/types/news";
import { CheckIcon, ChevronDown, FilterIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FilterBarProps {
  onFilterChange: (filters: Filters) => void;
}

interface Filters {
  stages: FundingStage[];
  sectors: Sector[];
  regions: Region[];
  types: NewsType[];
}

const FilterBar = ({ onFilterChange }: FilterBarProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    stages: [],
    sectors: [],
    regions: [],
    types: [],
  });

  // Available options
  const stageOptions: FundingStage[] = ["Seed", "Series A", "Series B", "Series C+", "Growth", "IPO"];
  const sectorOptions: Sector[] = [
    "AI & ML", 
    "Fintech", 
    "Health Tech", 
    "Climate Tech", 
    "EdTech", 
    "SaaS", 
    "E-commerce", 
    "Crypto", 
    "Hardware", 
    "Consumer", 
    "Enterprise", 
    "Other"
  ];
  const regionOptions: Region[] = [
    "North America", 
    "Europe", 
    "Asia", 
    "Africa", 
    "South America", 
    "Oceania", 
    "Global"
  ];
  const typeOptions: NewsType[] = ["Success", "Funding", "Acquisition", "Failure", "Launch"];

  const handleFilterChange = <T extends FundingStage | Sector | Region | NewsType>(category: keyof Filters, value: T) => {
    const updatedFilters = { ...filters };
    const index = updatedFilters[category].indexOf(value as any);
    
    if (index >= 0) {
      updatedFilters[category] = updatedFilters[category].filter((item) => item !== value);
    } else {
      updatedFilters[category] = [...updatedFilters[category], value as any];
    }
    
    setFilters(updatedFilters);
    onFilterChange(updatedFilters);
  };

  const clearFilters = () => {
    const emptyFilters = {
      stages: [],
      sectors: [],
      regions: [],
      types: [],
    };
    setFilters(emptyFilters);
    onFilterChange(emptyFilters);
  };

  const countActiveFilters = () => {
    return filters.stages.length + filters.sectors.length + filters.regions.length + filters.types.length;
  };

  const renderFilterDropdown = <T extends string>(
    label: string, 
    options: T[], 
    category: keyof Filters,
    selectedItems: string[]
  ) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="bg-white">
          <span>{label}</span>
          <ChevronDown size={16} className="ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option}
            checked={selectedItems.includes(option)}
            onCheckedChange={() => handleFilterChange(category, option as any)}
          >
            <span className="flex-1">{option}</span>
            {selectedItems.includes(option) && <CheckIcon size={16} className="ml-2" />}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="bg-white border-b sticky top-16 z-10 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Button 
                variant="outline"
                onClick={() => setIsOpen(!isOpen)}
                className="mr-2"
              >
                <FilterIcon size={16} className="mr-2" />
                <span>Filters</span>
                {countActiveFilters() > 0 && (
                  <span className="ml-2 bg-oxford text-white rounded-full h-5 w-5 flex items-center justify-center text-xs">
                    {countActiveFilters()}
                  </span>
                )}
              </Button>
              
              {isOpen && (
                <div className="hidden md:flex space-x-2">
                  {renderFilterDropdown("Funding Stage", stageOptions, "stages", filters.stages)}
                  {renderFilterDropdown("Sector", sectorOptions, "sectors", filters.sectors)}
                  {renderFilterDropdown("Region", regionOptions, "regions", filters.regions)}
                  {renderFilterDropdown("Type", typeOptions, "types", filters.types)}
                </div>
              )}
            </div>
            
            {countActiveFilters() > 0 && (
              <Button 
                variant="ghost" 
                onClick={clearFilters}
                className="text-sm"
              >
                Clear filters
              </Button>
            )}
          </div>
          
          {isOpen && (
            <div className="md:hidden grid grid-cols-2 gap-2 mt-3">
              {renderFilterDropdown("Funding Stage", stageOptions, "stages", filters.stages)}
              {renderFilterDropdown("Sector", sectorOptions, "sectors", filters.sectors)}
              {renderFilterDropdown("Region", regionOptions, "regions", filters.regions)}
              {renderFilterDropdown("Type", typeOptions, "types", filters.types)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FilterBar;
