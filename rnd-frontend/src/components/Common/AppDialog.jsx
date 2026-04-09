import { Modal, Button } from 'react-bootstrap';

const AppDialog = ({
    show,
    title,
    message,
    confirmText = 'OK',
    cancelText = 'Cancel',
    confirmVariant = 'danger',
    showCancel = false,
    onConfirm,
    onCancel,
    onClose,
    busy = false
}) => {
    return (
        <Modal show={show} onHide={onClose} centered backdrop="static" keyboard={!busy}>
            <Modal.Header closeButton={!busy}>
                <Modal.Title>{title}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {typeof message === 'string' ? <p className="mb-0">{message}</p> : message}
            </Modal.Body>
            <Modal.Footer>
                {showCancel && (
                    <Button type="button" variant="secondary" onClick={onCancel || onClose} disabled={busy}>
                        {cancelText}
                    </Button>
                )}
                <Button type="button" variant={confirmVariant} onClick={onConfirm || onClose} disabled={busy}>
                    {confirmText}
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default AppDialog;
