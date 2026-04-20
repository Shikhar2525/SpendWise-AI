import * as React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  
  // Logic to show a limited number of page numbers with ellipsis
  const getVisiblePages = () => {
    if (totalPages <= 7) return pages;
    
    const visiblePages: (number | string)[] = [1];
    
    if (currentPage > 3) {
      visiblePages.push("ellipsis-1");
    }
    
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    
    for (let i = start; i <= end; i++) {
        if (!visiblePages.includes(i)) {
            visiblePages.push(i);
        }
    }
    
    if (currentPage < totalPages - 2) {
      visiblePages.push("ellipsis-2");
    }
    
    if (!visiblePages.includes(totalPages)) {
        visiblePages.push(totalPages);
    }
    
    return visiblePages;
  };

  return (
    <nav
      role="navigation"
      aria-label="pagination"
      className={cn("flex w-full justify-center gap-1 py-4", className)}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="h-8 w-8 rounded-lg"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="sr-only">Previous page</span>
      </Button>

      <div className="flex items-center gap-1">
        {getVisiblePages().map((page, index) => {
          if (typeof page === "string") {
            return (
              <div key={page} className="flex h-8 w-8 items-center justify-center">
                <MoreHorizontal className="h-4 w-4 text-zinc-400" />
              </div>
            );
          }

          return (
            <Button
              key={page}
              variant={currentPage === page ? "default" : "ghost"}
              size="icon"
              onClick={() => onPageChange(page)}
              className={cn(
                "h-8 w-8 rounded-lg text-xs font-bold",
                currentPage === page 
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-black shadow-md" 
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              )}
            >
              {page}
            </Button>
          );
        })}
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="h-8 w-8 rounded-lg"
      >
        <ChevronRight className="h-4 w-4" />
        <span className="sr-only">Next page</span>
      </Button>
    </nav>
  );
}
