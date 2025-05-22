import React, { useState } from "react";
import FilterData from "../InsightsContent/filter";
import TicketIssuance from "./TicketIssuance";
import ClosingAccuracy from "./ClosingAccuracy";

const InsightLayout = () => {
  const [selectedAccuracyView, setSelectedAccuracyView] =
    useState("ticketIssuance");

  return (
    <div>
      this is lay out
    </div>
  );
};

export default InsightLayout;
