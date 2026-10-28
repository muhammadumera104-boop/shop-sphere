"use client";
import { useState } from "react";

export function StarPicker({ name = "rating" }: { name?: string }) {
  const [value, setValue] = useState(0);
  return (
    <fieldset className="flex gap-1">
      <legend className="sr-only">Rating</legend>
      {[1, 2, 3, 4, 5].map((n) => (
        <label key={n} className="cursor-pointer">
          <input type="radio" name={name} value={n} className="sr-only peer" required onChange={() => setValue(n)} />
          <span aria-hidden className={`text-2xl leading-none peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-indigo-600 rounded ${n <= value ? "text-gold" : "text-gray-300"}`}>
            ★
          </span>
          <span className="sr-only">
            {n} star{n > 1 ? "s" : ""}
          </span>
        </label>
      ))}
    </fieldset>
  );
}
