import React from "react";

const ComingSoon = () => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6">
      <div className="max-w-xl w-full rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-10 text-center shadow-sm">
        <p className="text-xs font-semibold tracking-[0.25em] text-amber-600 uppercase">
          Support
        </p>
        <h1 className="mt-3 text-3xl md:text-4xl font-extrabold text-gray-900">
          Coming Soon
        </h1>
        <p className="mt-4 text-gray-600 leading-relaxed">
          We are building a dedicated support center for this section. Please
          check back soon.
        </p>
      </div>
    </div>
  );
};

export default ComingSoon;
