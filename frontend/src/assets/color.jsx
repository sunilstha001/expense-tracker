// constants/financeConstants.js
// constants/financeConstants.js
import { 
  Utensils, Home, Car, ShoppingCart, Gift, 
  TrendingUp, TrendingDown, DollarSign, 
  BarChart2, ArrowUp, FileText, 
  Briefcase, CreditCard, ShoppingBag, 
  Film, Wifi, Heart
} from "lucide-react";


export const GAUGE_COLORS = {
  Income: { 
    gradientStart: '#6366f1',
    gradientEnd: '#4338ca',
    text: 'text-indigo-700',
    bg: 'bg-indigo-100'
  },
  Spent: { 
    gradientStart: '#fb7185',
    gradientEnd: '#e11d48',
    text: 'text-rose-700',
    bg: 'bg-rose-100'
  },
  Savings: { 
    gradientStart: '#38bdf8',
    gradientEnd: '#0284c7',
    text: 'text-sky-700',
    bg: 'bg-sky-100'
  }
};

export const COLORS = ['#14b8a6', '#0ea5e9', '#fb7185', '#f59e0b', '#0f766e', '#0284c7', '#e11d48'];

export const INCOME_COLORS = [
  '#6366f1', '#818cf8', '#a5b4fc', '#93c5fd', '#bae6fd'
];

export const CATEGORY_ICONS_Inc = {
  Salary: <TrendingUp className="w-4 h-4" />,
  Freelance: <BarChart2 className="w-4 h-4" />,
  Investment: <ArrowUp className="w-4 h-4" />,
  Bonus: <FileText className="w-4 h-4" />,
  Other: <DollarSign className="w-4 h-4" />
};

export const CATEGORY_ICONS = {
  Food: <Utensils className="w-4 h-4" />,
  Housing: <Home className="w-4 h-4" />,
  Transport: <Car className="w-4 h-4" />,
  Shopping: <ShoppingCart className="w-4 h-4" />,
  Entertainment: <Gift className="w-4 h-4" />,
  Utilities: <Home className="w-4 h-4" />,
  Healthcare: <Gift className="w-4 h-4" />,
  Salary: <TrendingUp className="w-4 h-4" />,
  Freelance: <TrendingDown className="w-4 h-4" />,
  Other: <DollarSign className="w-4 h-4" />
};

// Enhanced category icons with more specific icons for income categories
export const INCOME_CATEGORY_ICONS = {
  Salary: <Briefcase className="w-5 h-5 text-indigo-500" />,
  Freelance: <CreditCard className="w-5 h-5 text-indigo-500" />,
  Investment: <TrendingUp className="w-5 h-5 text-indigo-500" />,
  Gift: <Gift className="w-5 h-5 text-indigo-500" />,
  Other: <DollarSign className="w-5 h-5 text-indigo-500" />,
};

export const EXPENSE_CATEGORY_ICONS = {
  Food: <Utensils className="w-5 h-5 text-orange-500" />,
  Housing: <Home className="w-5 h-5 text-orange-500" />,
  Transport: <Car className="w-5 h-5 text-orange-500" />,
  Shopping: <ShoppingBag className="w-5 h-5 text-orange-500" />,
  Entertainment: <Film className="w-5 h-5 text-orange-500" />,
  Utilities: <Wifi className="w-5 h-5 text-orange-500" />,
  Healthcare: <Heart className="w-5 h-5 text-orange-500" />,
  Other: <ShoppingCart className="w-5 h-5 text-orange-500" />,
};

export const colorClasses = {
    income: {
      bg: "bg-indigo-100",
      text: "text-indigo-700",
      border: "border-indigo-200",
      ring: "ring-indigo-500",
      button: "bg-indigo-500 hover:bg-indigo-600 text-white",
      iconBg: "bg-indigo-100 text-indigo-700",
    },
    expense: {
      bg: "bg-rose-100",
      text: "text-rose-700",
      border: "border-rose-200",
      ring: "ring-rose-500",
      button: "bg-rose-500 hover:bg-rose-600 text-white",
      iconBg: "bg-rose-100 text-rose-700",
    },
  };