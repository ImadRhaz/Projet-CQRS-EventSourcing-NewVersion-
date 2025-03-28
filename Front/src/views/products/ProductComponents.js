import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import axios from 'axios';
import Swal from 'sweetalert2';
import {
    Container,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Button,
    Typography,
    Box,
    CircularProgress,
    Pagination,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    IconButton,
    Autocomplete
} from '@mui/material';
import { BASE_URL } from '../../config';
import { jwtDecode } from 'jwt-decode';

const ProductComponents = () => {
    const { id } = useParams(); // FM1 ID
    const [composents, setComposents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 7;

    // New composent state
    const [newComposent, setNewComposent] = useState({
        productName: '',
        sn: '',
        totalAvailable: 0,
        urgentOrNot: 'No',
        orderOrNot: 'No', // Default value for new components
        fM1Id: id, // Use FM1 ID directly
    });

    const [editingComposent, setEditingComposent] = useState(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    const [isCommandeDialogOpen, setIsCommandeDialogOpen] = useState(false);
    const [selectedComposent, setSelectedComposent] = useState(null);
    const [raisonDeCommande, setRaisonDeCommande] = useState('');

    const [userId, setUserId] = useState(null);
    const [refresh, setRefresh] = useState(false); // State to trigger refresh

    // État pour stocker les données des composants
    const [composentOptions, setComposentOptions] = useState([]);

    // Récupérer les données des composants au montage du composant
    useEffect(() => {
        const fetchComposentOptions = async () => {
            try {
                const response = await axios.get(`${BASE_URL}ExcelFm1/get-all-composent`);
                setComposentOptions(response.data); // Stocker les données dans l'état
            } catch (error) {
                console.error('Erreur lors de la récupération des données des composants', error);
                setError('Failed to fetch composent data');
            }
        };

        fetchComposentOptions();
    }, []);

    // Use useCallback to memoize fetchComposents
    const fetchComposents = useCallback(async () => {
        setLoading(true);
        setError(null);  // Clear any previous errors
        try {
            // Use the correct endpoint
            const response = await axios.get(`${BASE_URL}Query/composents/by-fm1/${id}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });
            setComposents(response.data);  // Set with the data
            console.log("Composents data:", response.data);
        } catch (error) {
            console.error("Erreur lors de la récupération des composants:", error);
            setError("Échec de la récupération des données !");  // Generic error message
        } finally {
            setLoading(false);
        }
    }, [id]); // Only recreate if `id` changes

    useEffect(() => {
        fetchComposents();
    }, [fetchComposents, refresh]); // fetchComposents is a dependency

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decodedToken = jwtDecode(token);
                const userId = decodedToken.nameid || decodedToken.sub;

                if (userId) {
                    setUserId(userId);
                } else {
                    console.error('User ID not found in token');
                    setError('User ID not found in token.');
                    setLoading(false);  // Stop loading if cannot get user id
                }
            } catch (error) {
                console.error('Erreur lors du décodage du token:', error);
                setError('Token invalide. Veuillez vous reconnecter.');
            }
        } else {
            console.error('Aucun token trouvé dans localStorage');
            setError('Vous devez vous reconnecter.');
        }
    }, []);

    const handleAddComposent = async () => {
        if (!newComposent.productName || !newComposent.sn) {
            Swal.fire('Erreur', 'Veuillez sélectionner un composant.', 'error');
            return;
        }

        try {
            const response = await axios.post(`${BASE_URL}Command/add-composent`, newComposent, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });

            setComposents((prev) => [...prev, { ...newComposent, id: response.data.id }]);
            Swal.fire('Succès', 'La composent a été ajoutée avec succès!', 'success');
            setNewComposent({
                productName: '',
                sn: '',
                totalAvailable: 0,
                urgentOrNot: 'No',
                orderOrNot: 'No',
                fM1Id: id,
            });
            setRefresh((prev) => !prev); // Trigger refresh after success

        } catch (error) {
            console.error("Erreur lors de l'ajout de la composent:", error);
            Swal.fire('Erreur', 'Une erreur est survenue lors de l\'ajout de la composent.', 'error');
        }
    };

    const handleDelete = async (composentId) => {
        try {
            const response = await axios.delete(`${BASE_URL}api/Composent/${composentId}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });
            if (response.status === 204) {
                const updatedComposents = composents.filter(composent => composent.id !== composentId);
                setComposents(updatedComposents);
                Swal.fire('Supprimé !', 'La composent a été supprimée.', 'success');
                setRefresh((prev) => !prev); // Trigger refresh after success
            }
        } catch (error) {
            console.error('Échec de la suppression de la composent', error);
            Swal.fire('Erreur', `Échec de la suppression de la composant: ${error.message}`, 'error');
        }
    };

    const handleEditComposent = (composent) => {
        setEditingComposent(composent);
        setIsEditDialogOpen(true);
    };

    const handleCloseEditDialog = () => {
        setIsEditDialogOpen(false);
        setEditingComposent(null);
    };

    const handleSaveEdit = async () => {
        if (!editingComposent) return;

        try {
            await axios.put(`${BASE_URL}Piece/${editingComposent.id}`, {
                productName: editingComposent.productName,
                sn: editingComposent.sn,
                totalAvailable: editingComposent.totalAvailable,
                urgentOrNot: editingComposent.urgentOrNot,
                orderOrNot: editingComposent.orderOrNot,
                fM1Id: editingComposent.fM1Id,
            }, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });

            const updatedComposents = composents.map(p =>
                p.id === editingComposent.id ? { ...editingComposent } : p
            );
            setComposents(updatedComposents);

            Swal.fire('Succès', 'La composent a été modifiée avec succès!', 'success');
            handleCloseEditDialog();
            setRefresh((prev) => !prev); // Trigger refresh after success
        } catch (error) {
            console.error("Erreur lors de la modification de la composent:", error);
            Swal.fire('Erreur', 'Une erreur est survenue lors de la modification de la composent.', 'error');
        }
    };

    const handleOpenCommandeDialog = (composent) => {
        setSelectedComposent(composent);
        setIsCommandeDialogOpen(true);
    };

    const handleCloseCommandeDialog = () => {
        setIsCommandeDialogOpen(false);
        setSelectedComposent(null);
        setRaisonDeCommande('');
    };

    const handleSaveCommande = async () => {
        if (!selectedComposent || !raisonDeCommande) {
            Swal.fire('Erreur', 'Veuillez remplir la raison de la commande.', 'error');
            return;
        }

        const commandeData = {
            etatCommande: "En attente",
            dateCmd: new Date().toISOString(),
            composentId: selectedComposent.id,
            expertId: userId,
            raisonDeCommande: raisonDeCommande,
            fM1Id: id,
        };

        try {
            await axios.post(`${BASE_URL}Command/add-commande`, commandeData, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });
            Swal.fire('Succès', 'La commande a été enregistrée avec succès!', 'success');
            handleCloseCommandeDialog();
            setRefresh((prev) => !prev); // Trigger refresh after success
        } catch (error) {
            console.error("Erreur lors de la création de la commande:", error);
            Swal.fire('Erreur', 'Une erreur est survenue lors de la création de la commande.', 'error');
        }
    };

    const handlePageChange = (event, value) => {
        setCurrentPage(value);
    };

    const getPaginatedComposents = () => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return composents.slice(startIndex, endIndex);
    };

    if (loading) return <CircularProgress />;
    if (error) return <Typography color="error">{error}</Typography>;

    const paginatedComposents = getPaginatedComposents();

    return (
        <Container>
            <Typography variant="h4" gutterBottom>
                Gestion des Composants 
            </Typography>

            <Box mb={4}>
                <Typography variant="h6">Ajouter un Composant</Typography>
                <Autocomplete
                    options={composentOptions}
                    getOptionLabel={(option) => option.composentName}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Composant"
                            variant="outlined"
                            fullWidth
                            margin="normal"
                            required
                        />
                    )}
                    onChange={(event, newValue) => {
                        if (newValue) {
                            setNewComposent({
                                ...newComposent,
                                productName: newValue.composentName,
                                sn: newValue.snComposent,
                                totalAvailable: newValue.totalAvailable,
                            });
                        } else {
                            setNewComposent({
                                ...newComposent,
                                productName: '',
                                sn: '',
                                totalAvailable: 0,
                            });
                        }
                    }}
                />
                <FormControl fullWidth margin="normal">
                    <InputLabel id="urgent-or-not-label">Urgent?</InputLabel>
                    <Select
                        labelId="urgent-or-not-label"
                        id="urgentOrNot"
                        value={newComposent.urgentOrNot}
                        onChange={(e) => setNewComposent({ ...newComposent, urgentOrNot: e.target.value })}
                        label="Urgent?"
                    >
                        <MenuItem value="Yes">Yes</MenuItem>
                        <MenuItem value="No">No</MenuItem>
                    </Select>
                </FormControl>

                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleAddComposent}
                    style={{ marginTop: '16px' }}
                >
                    Ajouter Composant
                </Button>
            </Box>

            {error && (
                <Typography color="error" >
                    {error}
                </Typography>
            )}

            <Typography variant="h5" gutterBottom>
                Liste des Composants
            </Typography>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Product Name</TableCell>
                            <TableCell>Serial Number (SN)</TableCell>
                            <TableCell>Total Available</TableCell>
                            <TableCell>Urgent?</TableCell>
                            <TableCell>Order?</TableCell>
                            <TableCell>Etat Commande</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {paginatedComposents && paginatedComposents.length > 0 ? (
                            paginatedComposents.map((composent) => (
                                <TableRow key={composent.id} hover>
                                    <TableCell>{composent.productName}</TableCell>
                                    <TableCell>{composent.sn}</TableCell>
                                    <TableCell>{composent.totalAvailable}</TableCell>
                                    <TableCell>{composent.urgentOrNot}</TableCell>
                                    <TableCell>{composent.orderOrNot}</TableCell>
                                    <TableCell>
                                        {composent.etatCommande ?? 'N/A'}
                                    </TableCell>
                                    <TableCell>
                                        <Tooltip title="Commander">
                                            <Button
                                                variant="outlined"
                                                color="secondary"
                                                onClick={() => handleOpenCommandeDialog(composent)}
                                            >
                                                Commander
                                            </Button>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={7} align="center">
                                    <Typography variant="h6" color="textSecondary">
                                        Aucun composant disponible !
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
            <Box mt={2} display="flex" justifyContent="center">
                <Pagination
                    count={Math.ceil(composents.length / itemsPerPage)}
                    page={currentPage}
                    onChange={handlePageChange}
                />
            </Box>

            {/* Edit Dialog (no changes) */}
            <Dialog open={isEditDialogOpen} onClose={handleCloseEditDialog}>
                <DialogTitle>Modifier la composant</DialogTitle>
                <DialogContent>
                    <TextField
                        label="Product Name"
                        value={editingComposent?.productName || ''}
                        onChange={(e) => setEditingComposent({ ...editingComposent, productName: e.target.value })}
                        fullWidth
                        margin="normal"
                    />
                    <TextField
                        label="Serial Number (SN)"
                        value={editingComposent?.sn || ''}
                        onChange={(e) => setEditingComposent({ ...editingComposent, sn: e.target.value })}
                        fullWidth
                        margin="normal"
                    />
                    <TextField
                        label="Total Available"
                        value={editingComposent?.totalAvailable || 0}
                        onChange={(e) => setEditingComposent({ ...editingComposent, totalAvailable: parseInt(e.target.value) })}
                        fullWidth
                        margin="normal"
                        type="number"
                    />
                    <FormControl fullWidth margin="normal">
                        <InputLabel id="urgent-or-not-edit-label">Urgent?</InputLabel>
                        <Select
                            labelId="urgent-or-not-edit-label"
                            id="urgentOrNotEdit"
                            value={editingComposent?.urgentOrNot || 'No'}
                            onChange={(e) => setEditingComposent({ ...editingComposent, urgentOrNot: e.target.value })}
                            label="Urgent?"
                        >
                            <MenuItem value="Yes">Yes</MenuItem>
                            <MenuItem value="No">No</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl fullWidth margin="normal">
                        <InputLabel id="order-or-not-edit-label">Order?</InputLabel>
                        <Select
                            labelId="order-or-not-edit-label"
                            id="orderOrNotEdit"
                            value={editingComposent?.orderOrNot || 'No'}
                            onChange={(e) => setEditingComposent({ ...editingComposent, orderOrNot: e.target.value })}
                            label="Order?"
                        >
                            <MenuItem value="Yes">Yes</MenuItem>
                            <MenuItem value="No">No</MenuItem>
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseEditDialog}>Annuler</Button>
                    <Button onClick={handleSaveEdit} color="primary">Enregistrer</Button>
                </DialogActions>
            </Dialog>

            {/* Commande Dialog (no changes) */}
            <Dialog open={isCommandeDialogOpen} onClose={handleCloseCommandeDialog}>
                <DialogTitle>Commander la composant</DialogTitle>
                <DialogContent>
                    <TextField
                        label="Raison de la Commande"
                        value={raisonDeCommande}
                        onChange={(e) => setRaisonDeCommande(e.target.value)}
                        fullWidth
                        margin="normal"
                        multiline
                        rows={4}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseCommandeDialog}>Annuler</Button>
                    <Button onClick={handleSaveCommande} color="primary">Enregistrer</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default ProductComponents;