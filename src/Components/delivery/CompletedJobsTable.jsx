import React from 'react';
import ReusableTable from '../ReusableTable';
import { formatDate } from '../../utils/exportUtils';
import { pickupStatusStyles, deliveryStatusStyles } from '../../constants/statusStyles';

const CompletedJobsTable = ({ jobs, onView }) => {
  const columns = [
    { header: 'Job ID', accessor: 'jobId' },
    { header: 'Customer Name', accessor: 'customerName' },
    { header: 'Job Type', accessor: 'jobType' },
    {
      header: 'Completion Date',
      accessor: 'completionDate',
      format: (val) => formatDate(val),
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: (row) => {
        const styles =
          row.jobType === 'Pickup'
            ? pickupStatusStyles[row.status] || pickupStatusStyles.Completed
            : deliveryStatusStyles[row.status] || deliveryStatusStyles.Delivered;
        return <span className={styles}>{row.status}</span>;
      },
    },
  ];

  return <ReusableTable columns={columns} data={jobs} onRowClick={onView} />;
};

export default CompletedJobsTable;
