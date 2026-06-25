export const getBookingFiles = (booking) => {
  if (booking?.files?.length) return booking.files;
  if (!booking?.fileUrl) return [];
  return [{
    url: booking.fileUrl,
    name: booking.fileName,
    originalName: booking.fileOriginalName || 'document.pdf',
    downloaded: booking.fileDownloaded
  }];
};

export const getFileDownloadKey = (bookingId, fileIndex) => `${bookingId}:${fileIndex}`;

export const areAllBookingFilesDownloaded = (booking, downloadedFiles) => {
  const files = getBookingFiles(booking);
  return files.length === 0 || files.every((file, index) =>
    file.downloaded || downloadedFiles.has(getFileDownloadKey(booking._id, index))
  );
};
