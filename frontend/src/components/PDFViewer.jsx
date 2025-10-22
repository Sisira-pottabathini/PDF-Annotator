// src/components/PDFViewer.jsx
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { 
  ArrowLeft, 
  Highlighter, 
  MessageSquare, 
  ZoomIn, 
  ZoomOut,
  Download,
  Save,
  Trash2,
  Loader,
  RefreshCw,
  FileText
} from 'lucide-react';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

const PDFViewer = ({ pdf, user, onBack }) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [tool, setTool] = useState('highlight');
  const [annotations, setAnnotations] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [selectedAnnotation, setSelectedAnnotation] = useState(null);
  const [pdfError, setPdfError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pdfFile, setPdfFile] = useState(null);
  const containerRef = useRef();

  // Debug: Log the received PDF
  useEffect(() => {
    console.log('📄 PDFViewer received:', pdf);
  }, [pdf]);

  // Handle PDF file when component mounts or PDF changes
  useEffect(() => {
    if (!pdf) {
      setPdfError('No PDF provided');
      setIsLoading(false);
      return;
    }

    console.log('🔄 Processing PDF:', {
      name: pdf.name,
      hasFile: !!pdf.file,
      hasUrl: !!pdf.url,
      fileType: pdf.file?.type
    });

    setIsLoading(true);
    setPdfError(null);

    // If we have a file object, use it directly
    if (pdf.file && pdf.file instanceof File) {
      console.log('✅ Using File object directly');
      setPdfFile(pdf.file);
    }
    // If we have a URL, use it
    else if (pdf.url) {
      console.log('✅ Using URL');
      setPdfFile(pdf.url);
    }
    else {
      console.error('❌ No valid PDF source found');
      setPdfError('No valid PDF file available');
      setIsLoading(false);
    }
  }, [pdf]);

  const onDocumentLoadSuccess = useCallback(({ numPages }) => {
    console.log('✅ PDF loaded successfully! Pages:', numPages);
    setNumPages(numPages);
    setPdfError(null);
    setIsLoading(false);
  }, []);

  const onDocumentLoadError = useCallback((error) => {
    console.error('❌ PDF loading error:', error);
    setPdfError('Failed to load PDF. Please check if the file is valid.');
    setIsLoading(false);
  }, []);

  const handleRetry = () => {
    console.log('🔄 Retrying PDF load...');
    setPdfError(null);
    setIsLoading(true);
    // Force re-render by resetting the PDF file
    setPdfFile(null);
    setTimeout(() => {
      if (pdf?.file) setPdfFile(pdf.file);
      else if (pdf?.url) setPdfFile(pdf.url);
    }, 100);
  };

  const handlePageClick = (event) => {
    const pageElement = event.currentTarget.querySelector('.react-pdf__Page');
    if (!pageElement) return;

    try {
      const pageRect = pageElement.getBoundingClientRect();
      const x = ((event.clientX - pageRect.left) / pageRect.width) * 100;
      const y = ((event.clientY - pageRect.top) / pageRect.height) * 100;

      if (tool === 'highlight') {
        const newAnnotation = {
          id: `ann_${Date.now()}`,
          type: 'highlight',
          page: pageNumber,
          x: Math.max(0, Math.min(95, x - 2.5)),
          y: Math.max(0, Math.min(95, y - 1)),
          width: 5,
          height: 2,
          color: '#FFEB3B',
          opacity: 0.6,
          content: 'Highlight',
          createdAt: new Date().toISOString(),
          createdBy: user.name
        };
        setAnnotations(prev => [...prev, newAnnotation]);
      } else if (tool === 'comment') {
        if (!newComment.trim()) {
          alert('Please enter a comment first');
          return;
        }

        const newAnnotation = {
          id: `ann_${Date.now()}`,
          type: 'comment',
          page: pageNumber,
          x: Math.max(0, Math.min(90, x)),
          y: Math.max(0, Math.min(90, y)),
          width: 200,
          height: 'auto',
          color: '#4CAF50',
          content: newComment,
          createdAt: new Date().toISOString(),
          createdBy: user.name
        };
        setAnnotations(prev => [...prev, newAnnotation]);
        setNewComment('');
      }
    } catch (error) {
      console.error('Error handling page click:', error);
    }
  };

  const updateAnnotationContent = (id, content) => {
    setAnnotations(prev => 
      prev.map(ann => 
        ann.id === id ? { ...ann, content } : ann
      )
    );
  };

  const deleteAnnotation = (id) => {
    setAnnotations(prev => prev.filter(ann => ann.id !== id));
    setSelectedAnnotation(null);
  };

  const saveAnnotations = () => {
    if (!pdf?.id) {
      alert('No PDF selected');
      return;
    }

    const dataToSave = {
      pdfId: pdf.id,
      pdfName: pdf.name,
      annotations,
      savedAt: new Date().toISOString(),
      user: user.name
    };
    
    localStorage.setItem(`annotations_${pdf.id}`, JSON.stringify(dataToSave));
    alert('Annotations saved successfully!');
  };

  const downloadPDF = () => {
    if (!pdfFile) {
      alert('No PDF available for download');
      return;
    }

    try {
      if (pdfFile instanceof File) {
        const url = URL.createObjectURL(pdfFile);
        const link = document.createElement('a');
        link.href = url;
        link.download = pdf.name || 'document.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else if (typeof pdfFile === 'string') {
        const link = document.createElement('a');
        link.href = pdfFile;
        link.download = pdf.name || 'document.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download PDF');
    }
  };

  const currentPageAnnotations = annotations.filter(ann => ann.page === pageNumber);

  return (
    <div className="pdf-viewer">
      {/* Single Line Toolbar */}
      <div className="viewer-toolbar">
        <div className="toolbar-main-line">
          {/* Left Section */}
          <div className="toolbar-left">
            <button onClick={onBack} className="toolbar-button back-button">
              <ArrowLeft size={20} />
              Back
            </button>
          </div>

          {/* Center Section - Tools */}
          <div className="toolbar-center">
            <div className="toolbar-group">
              <span className="toolbar-label">Tools:</span>
              <button 
                className={`toolbar-button ${tool === 'highlight' ? 'active' : ''}`}
                onClick={() => setTool('highlight')}
              >
                <Highlighter size={18} />
                Highlight
              </button>
              
              <button 
                className={`toolbar-button ${tool === 'comment' ? 'active' : ''}`}
                onClick={() => setTool('comment')}
              >
                <MessageSquare size={18} />
                Comment
              </button>
            </div>

            <div className="toolbar-group">
              <span className="toolbar-label">Zoom:</span>
              <button 
                className="toolbar-button"
                onClick={() => setScale(prev => Math.min(prev + 0.2, 3))}
                disabled={scale >= 3}
              >
                <ZoomIn size={18} />
              </button>
              <span className="scale-display">{Math.round(scale * 100)}%</span>
              <button 
                className="toolbar-button"
                onClick={() => setScale(prev => Math.max(prev - 0.2, 0.5))}
                disabled={scale <= 0.5}
              >
                <ZoomOut size={18} />
              </button>
            </div>
          </div>

          {/* Right Section - Actions */}
          <div className="toolbar-right">
            <div className="toolbar-group">
              <button className="toolbar-button save-button" onClick={saveAnnotations}>
                <Save size={18} />
                Save
              </button>
              <button className="toolbar-button" onClick={downloadPDF}>
                <Download size={18} />
                Download
              </button>
            </div>

            <div className="page-info-toolbar">
              {pdf?.name && (
                <span title={pdf.name}>
                  <FileText size={16} /> 
                  <span className="pdf-name">{pdf.name}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pdf-main-container">
        {/* PDF Display Area */}
        <div className="pdf-display-area">
          <div className="pdf-navigation">
            <button 
              onClick={() => setPageNumber(prev => Math.max(prev - 1, 1))}
              disabled={pageNumber <= 1}
              className="nav-button"
            >
              Previous
            </button>
            
            <div className="page-controls">
              <span className="page-info">
                Page {pageNumber} of {numPages || '?'}
              </span>
              {numPages && (
                <div className="page-input">
                  <input
                    type="number"
                    min="1"
                    max={numPages}
                    value={pageNumber}
                    onChange={(e) => {
                      const newPage = parseInt(e.target.value);
                      if (newPage >= 1 && newPage <= numPages) {
                        setPageNumber(newPage);
                      }
                    }}
                    className="page-number-input"
                  />
                </div>
              )}
            </div>
            
            <button 
              onClick={() => setPageNumber(prev => Math.min(prev + 1, numPages || prev))}
              disabled={pageNumber >= (numPages || 1)}
              className="nav-button"
            >
              Next
            </button>
          </div>

          <div className="pdf-content-wrapper" ref={containerRef}>
            {isLoading && !pdfError && (
              <div className="pdf-loading">
                <Loader className="loading-spinner" size={32} />
                <p>Loading PDF Document...</p>
                <small>{pdf?.name}</small>
              </div>
            )}

            {pdfError && (
              <div className="pdf-error">
                <div className="error-icon">⚠️</div>
                <h3>Failed to load PDF</h3>
                <p>{pdfError}</p>
                <div className="error-details">
                  <p><strong>File:</strong> {pdf?.name || 'Unknown'}</p>
                  <p><strong>Size:</strong> {pdf?.size || 'Unknown'}</p>
                  <p><strong>Source:</strong> {pdfFile ? 'Available' : 'Missing'}</p>
                </div>
                <div className="error-actions">
                  <button onClick={handleRetry} className="retry-button">
                    <RefreshCw size={16} />
                    Try Again
                  </button>
                  <button onClick={onBack} className="back-error-button">
                    <ArrowLeft size={16} />
                    Back to Dashboard
                  </button>
                </div>
              </div>
            )}

            {!pdfError && pdfFile && (
              <div 
                className="pdf-render-container"
                onClick={handlePageClick}
              >
                <Document
                  file={pdfFile}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={onDocumentLoadError}
                  loading={
                    <div className="pdf-loading">
                      <Loader className="loading-spinner" size={32} />
                      <p>Loading PDF content...</p>
                    </div>
                  }
                  noData={
                    <div className="pdf-error">
                      <h3>No PDF data</h3>
                      <p>The PDF file appears to be empty or corrupted</p>
                    </div>
                  }
                >
                  <Page 
                    pageNumber={pageNumber} 
                    scale={scale}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                    className="pdf-page"
                    loading={
                      <div className="page-loading">
                        <Loader size={24} />
                        <span>Loading page {pageNumber}...</span>
                      </div>
                    }
                  />
                </Document>

                {/* Annotations Overlay */}
                <div className="annotations-overlay">
                  {currentPageAnnotations.map(annotation => (
                    <div
                      key={annotation.id}
                      className={`annotation ${annotation.type} ${selectedAnnotation?.id === annotation.id ? 'selected' : ''}`}
                      style={{
                        left: `${annotation.x}%`,
                        top: `${annotation.y}%`,
                        width: annotation.type === 'highlight' ? `${annotation.width}%` : `${annotation.width}px`,
                        height: annotation.type === 'highlight' ? `${annotation.height}%` : 'auto',
                        backgroundColor: annotation.color,
                        opacity: annotation.opacity || 1
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAnnotation(annotation);
                      }}
                    >
                      {annotation.type === 'comment' && (
                        <div className="comment-bubble">
                          <div className="comment-content">
                            {selectedAnnotation?.id === annotation.id ? (
                              <textarea
                                value={annotation.content}
                                onChange={(e) => updateAnnotationContent(annotation.id, e.target.value)}
                                className="comment-textarea"
                                placeholder="Enter your comment..."
                                autoFocus
                                onBlur={() => setSelectedAnnotation(null)}
                              />
                            ) : (
                              <div>
                                <p className="comment-text">{annotation.content}</p>
                                <small className="comment-author">
                                  By {annotation.createdBy}
                                </small>
                              </div>
                            )}
                          </div>
                          {selectedAnnotation?.id === annotation.id && (
                            <button 
                              className="delete-annotation-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteAnnotation(annotation.id);
                              }}
                              title="Delete annotation"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      )}
                      {annotation.type === 'highlight' && selectedAnnotation?.id === annotation.id && (
                        <button 
                          className="delete-annotation-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteAnnotation(annotation.id);
                          }}
                          title="Delete highlight"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!pdfFile && !pdfError && !isLoading && (
              <div className="pdf-error">
                <div className="error-icon">📄</div>
                <h3>No PDF Available</h3>
                <p>Please select a valid PDF file to annotate.</p>
                <button onClick={onBack} className="back-error-button">
                  <ArrowLeft size={16} />
                  Back to Dashboard
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Annotations Sidebar */}
        <div className="annotations-sidebar">
          <div className="sidebar-header">
            <h3>Annotations</h3>
            <span className="annotations-count">
              {currentPageAnnotations.length} on page {pageNumber}
            </span>
          </div>

          {tool === 'comment' && (
            <div className="new-comment-section">
              <h4>Add New Comment</h4>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Type your comment here, then click on the PDF to place it..."
                className="new-comment-input"
                rows="3"
              />
              <small>Click on the PDF to place this comment</small>
            </div>
          )}

          <div className="current-tool-info">
            <div className="tool-info-line">
              <span><strong>Current Tool:</strong> {tool === 'highlight' ? 'Highlight' : 'Comment'}</span>
              {tool === 'highlight' ? (
                <small>Click on the PDF to add highlights</small>
              ) : (
                <small>Type a comment above and click on the PDF to place it</small>
              )}
            </div>
          </div>

          <div className="annotations-list">
            {currentPageAnnotations.length === 0 ? (
              <div className="no-annotations">
                <MessageSquare size={32} />
                <p>No annotations on this page</p>
                <small>Use the tools to add highlights and comments</small>
              </div>
            ) : (
              currentPageAnnotations.map(annotation => (
                <div 
                  key={annotation.id} 
                  className={`annotation-item ${selectedAnnotation?.id === annotation.id ? 'selected' : ''}`}
                  onClick={() => setSelectedAnnotation(annotation)}
                >
                  <div className="annotation-header">
                    <div 
                      className="annotation-type-icon"
                      style={{ 
                        backgroundColor: annotation.color,
                        opacity: annotation.opacity || 1
                      }}
                    >
                      {annotation.type === 'highlight' ? <Highlighter size={12} /> : <MessageSquare size={12} />}
                    </div>
                    <div className="annotation-content">
                      <div className="annotation-main-line">
                        <span className="annotation-type">{annotation.type}</span>
                        <span className="annotation-time">
                          {new Date(annotation.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      {annotation.content && annotation.content !== 'Highlight' && (
                        <p className="annotation-text">{annotation.content}</p>
                      )}
                      <div className="annotation-author">
                        By {annotation.createdBy}
                      </div>
                    </div>
                    <button 
                      className="delete-annotation-sidebar"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteAnnotation(annotation.id);
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {annotations.length > 0 && (
            <div className="sidebar-footer">
              <p>Total annotations: {annotations.length}</p>
              <button 
                className="clear-all-btn"
                onClick={() => {
                  if (confirm('Delete all annotations?')) {
                    setAnnotations([]);
                    setSelectedAnnotation(null);
                  }
                }}
              >
                Clear All
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PDFViewer;