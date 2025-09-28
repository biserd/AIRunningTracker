import { Button } from "@/components/ui/button";

interface StravaConnectButtonProps {
  onClick: () => void;
  disabled?: boolean;
  variant?: "orange" | "white";
  size?: "default" | "sm" | "lg";
}

export function StravaConnectButton({ 
  onClick, 
  disabled = false, 
  variant = "orange",
  size = "default" 
}: StravaConnectButtonProps) {
  const baseClasses = "font-semibold inline-flex items-center justify-center rounded transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";
  
  const variantClasses = {
    orange: "bg-[#FC5200] hover:bg-[#e04900] text-white focus:ring-[#FC5200]",
    white: "bg-white hover:bg-gray-50 text-[#FC5200] border border-[#FC5200] focus:ring-[#FC5200]"
  };
  
  const sizeClasses = {
    default: "h-12 px-6 text-sm",
    sm: "h-10 px-4 text-sm", 
    lg: "h-14 px-8 text-base"
  };

  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`}
      data-testid="strava-connect-button"
    >
      <svg 
        className="w-5 h-5 mr-2" 
        viewBox="0 0 24 24" 
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.599h4.172L10.463 0l-7 13.828h4.172"/>
      </svg>
      Connect with Strava
    </Button>
  );
}

interface StravaPoweredByProps {
  variant?: "orange" | "white" | "black";
  size?: "sm" | "md" | "lg";
  layout?: "horizontal" | "stacked";
}

export function StravaPoweredBy({ 
  variant = "orange",
  size = "md",
  layout = "horizontal" 
}: StravaPoweredByProps) {
  const colorClasses = {
    orange: "text-[#FC5200]",
    white: "text-white",
    black: "text-black"
  };
  
  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm", 
    lg: "text-base"
  };

  const iconSize = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6"
  };

  return (
    <div className={`inline-flex items-center ${layout === 'stacked' ? 'flex-col' : 'flex-row'} ${layout === 'stacked' ? 'gap-1' : 'gap-2'}`}>
      <span className={`${sizeClasses[size]} ${colorClasses[variant]} font-medium`}>
        Powered by
      </span>
      <div className={`inline-flex items-center ${layout === 'stacked' ? 'gap-1' : 'gap-2'}`}>
        <svg 
          className={`${iconSize[size]} ${colorClasses[variant]}`}
          viewBox="0 0 24 24" 
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.599h4.172L10.463 0l-7 13.828h4.172"/>
        </svg>
        <span className={`${sizeClasses[size]} ${colorClasses[variant]} font-bold`}>
          Strava
        </span>
      </div>
    </div>
  );
}

interface ViewOnStravaLinkProps {
  activityId: string | number;
  className?: string;
}

export function ViewOnStravaLink({ activityId, className = "" }: ViewOnStravaLinkProps) {
  return (
    <a
      href={`https://www.strava.com/activities/${activityId}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center text-[#FC5200] hover:text-[#e04900] font-medium underline transition-colors ${className}`}
      data-testid="view-on-strava-link"
    >
      <svg 
        className="w-4 h-4 mr-1" 
        viewBox="0 0 24 24" 
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.599h4.172L10.463 0l-7 13.828h4.172"/>
      </svg>
      View on Strava
    </a>
  );
}