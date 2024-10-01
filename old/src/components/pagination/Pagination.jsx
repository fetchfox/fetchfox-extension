import React, { useState, useEffect, useRef } from "react";
import { Loading } from "../common/Loading";
import { Checkbox } from "../common/Checkbox";
import { usePagination } from "../../state/gather";
import { useActiveJob } from "../../state/jobs";
import { useActivePage } from "../../state/navigation";

export const Pagination = ({ onChange, follow, count }) => {
  const activePage = useActivePage();
  const pagination = usePagination(activePage);

  const update = (f, c) => {
    const pages = pagination.links?.pages.filter((x) => f && x.pageNumber <= c);
    onChange({
      count: c,
      follow: f,
      links: pages,
    });
  };

  const size = 12;
  const style = {
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontStyle: "italic",
    fontSize: size,
    height: 30,
  };

  const loadingNode = (
    <div style={style}>
      <Loading size={size} /> Checking for pagination
    </div>
  );

  let paginationInfo;
  let paginationOptions;
  if (pagination.didInit && !pagination.loading) {
    const num = (pagination.links?.pages || []).length;

    if (num === 0) {
      paginationInfo = <div style={style}>No pagination found</div>;
    } else {
      paginationInfo = (
        <div style={style}>
          <Checkbox
            size={12}
            checked={follow}
            onClick={() => update(!follow, count)}
          >
            Follow pagination
          </Checkbox>
        </div>
      );

      const optionNodes = pagination.links.pages.map((link) => (
        <option key={link.pageNumber} value={link.pageNumber}>
          up to{" "}
          {link.pageNumber === 0 ? "current page" : `page ${link.pageNumber}`} (
          {link.url})
        </option>
      ));

      paginationOptions = (
        <div style={{ marginTop: -3 }}>
          <select
            value={count}
            onChange={(e) => update(follow, parseInt(e.target.value))}
            style={{ width: 150, overflow: "hidden", marginTop: 5 }}
          >
            {optionNodes}
          </select>
        </div>
      );
    }
  }

  return (
    <div>
      {pagination.loading && loadingNode}
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        {paginationInfo}
        {follow && paginationOptions}
      </div>
    </div>
  );
};
