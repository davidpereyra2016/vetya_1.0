import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  SafeAreaView,
  ScrollView, 
  TouchableOpacity, 
  Switch,
  Image,
  FlatList,
  Animated,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Dimensions
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import ServiceCard from '../../components/ServiceCard';
import useEmergencyStore from '../../store/useEmergencyStore';
import { useFocusEffect } from '@react-navigation/native';
import useAuthStore from '../../store/useAuthStore';

const { width } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  // Estado para manejar la carga de datos
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Estado para el modo disponible/no disponible para emergencias
  const [availableForEmergencies, setAvailableForEmergencies] = useState(false);
  
  // Obtener veterinarios disponibles del store
  const { availableVets, loadAvailableVets, activeEmergencies, loadActiveEmergencies } = useEmergencyStore();
  const { provider } = useAuthStore();

  // Estado para el panel de estadísticas
  const [stats, setStats] = useState({
    emergenciasAtendidas: 12,
    citasHoy: 3,
    citasPendientes: 8,
    valoracionPromedio: 4.8
  });
  
  // Estado para citas pendientes por confirmar
  const [pendingAppointments, setPendingAppointments] = useState([
    {
      id: 'cita3',
      usuarioNombre: 'Ana María Rodríguez',
      mascotaNombre: 'Toby',
      tipoMascota: 'Perro',
      raza: 'Golden Retriever',
      edad: '5 años',
      servicio: 'Consulta general',
      fechaHora: '19/05/2025 10:00',
      motivo: 'Revisión por pérdida de apetito',
      estado: 'pendiente',
      ubicacion: 'Domicilio',
      direccion: 'Av. Corrientes 2500, CABA'
    },
    {
      id: 'cita4',
      usuarioNombre: 'Jorge Martínez',
      mascotaNombre: 'Luna',
      tipoMascota: 'Gato',
      raza: 'Siamés',
      edad: '2 años',
      servicio: 'Vacunación',
      fechaHora: '20/05/2025 16:15',
      motivo: 'Vacuna anual',
      estado: 'pendiente',
      ubicacion: 'Clínica',
      direccion: ''
    }
  ]);

  // Cargar datos cuando el componente se monta o cuando la pantalla obtiene el foco
  useEffect(() => {
    loadInitialData();
  }, []);
  
  useFocusEffect(
    useCallback(() => {
      loadInitialData();
      return () => {};
    }, [])
  );
  
  // Función para cargar datos iniciales
  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([loadAvailableVets(), loadActiveEmergencies()]);
    } catch (error) {
      console.log('Error al cargar datos:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Función para actualizar datos (pull-to-refresh)
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadAvailableVets(), loadActiveEmergencies()]);
    } catch (error) {
      console.log('Error al actualizar datos:', error);
    } finally {
      setRefreshing(false);
    }
  };
  
  // Manejar la solicitud de emergencia
  const handleEmergencyRequest = () => {
    navigation.navigate('EmergencyForm');
  };
  
  // Manejar la selección de servicio
  const handleServiceSelect = (service) => {
    if (service.id === 'emergencias') {
      handleEmergencyRequest();
    } else if (service.id === 'mascotas') {
      navigation.navigate('Pets');
    } else if (service.id === 'citas') {
      navigation.navigate('Appointments');
    } else {
      // Otros servicios
      navigation.navigate('ServiceDetails', { service });
    }
  };

  // Función para togglear disponibilidad para emergencias (para prestadores)
  const toggleAvailability = async () => {
    setAvailableForEmergencies(!availableForEmergencies);
    // Aquí iría la lógica para actualizar en el backend
  };

  // Manejar confirmación o rechazo de cita
  const handleAppointmentResponse = (id, action) => {
    // Filtrar la cita por id
    const appointment = pendingAppointments.find(apt => apt.id === id);
    
    // Mostrar mensaje de confirmación
    Alert.alert(
      action === 'confirm' ? 'Confirmar cita' : 'Rechazar cita',
      `¿Estás seguro que deseas ${action === 'confirm' ? 'confirmar' : 'rechazar'} la cita con ${appointment.usuarioNombre} para ${appointment.mascotaNombre}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Sí', 
          onPress: () => {
            // Actualizar la lista de citas pendientes
            setPendingAppointments(pendingAppointments.filter(apt => apt.id !== id));
            
            // Mostrar confirmación
            Alert.alert(
              'Éxito',
              `La cita ha sido ${action === 'confirm' ? 'confirmada' : 'rechazada'} correctamente.`
            );
          }
        }
      ]
    );
  };

  // Contenido condicional basado en el tipo de usuario
  const renderContent = () => {
    if (provider) {
      // Renderizar vista para prestadores (veterinarios)
      return (
        <ScrollView 
          style={styles.container}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#4A80F0']}
            />
          }
        >
          <View style={styles.header}>
            <Text style={styles.welcomeText}>¡Hola, Dr. {provider.nombre || 'Veterinario'}!</Text>
            
            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>
                {availableForEmergencies ? 'Disponible para emergencias' : 'No disponible'}
              </Text>
              <Switch
                value={availableForEmergencies}
                onValueChange={toggleAvailability}
                trackColor={{ false: '#767577', true: '#81b0ff' }}
                thumbColor={availableForEmergencies ? '#4A80F0' : '#f4f3f4'}
              />
            </View>
          </View>
          
          {/* Panel de estadísticas */}
          <View style={styles.statsContainer}>
            <Text style={styles.sectionTitle}>Tus estadísticas</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.emergenciasAtendidas}</Text>
                <Text style={styles.statLabel}>Emergencias atendidas</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.citasHoy}</Text>
                <Text style={styles.statLabel}>Citas para hoy</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.citasPendientes}</Text>
                <Text style={styles.statLabel}>Citas pendientes</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.valoracionPromedio}</Text>
                <Text style={styles.statLabel}>Valoración</Text>
              </View>
            </View>
          </View>
          
          {/* Citas pendientes por confirmar */}
          {pendingAppointments.length > 0 && (
            <View style={styles.pendingSection}>
              <Text style={styles.sectionTitle}>Citas pendientes por confirmar</Text>
              {pendingAppointments.map(appointment => (
                <View key={appointment.id} style={styles.appointmentCard}>
                  <View style={styles.appointmentHeader}>
                    <Text style={styles.appointmentDate}>{appointment.fechaHora}</Text>
                    <Text style={styles.appointmentType}>{appointment.servicio}</Text>
                  </View>
                  <View style={styles.appointmentDetails}>
                    <Text style={styles.appointmentClient}>Cliente: {appointment.usuarioNombre}</Text>
                    <Text style={styles.appointmentPet}>Mascota: {appointment.mascotaNombre} ({appointment.tipoMascota} - {appointment.raza})</Text>
                    <Text style={styles.appointmentLocation}>Ubicación: {appointment.ubicacion}</Text>
                    {appointment.direccion ? <Text style={styles.appointmentAddress}>Dirección: {appointment.direccion}</Text> : null}
                    <Text style={styles.appointmentReason}>Motivo: {appointment.motivo}</Text>
                  </View>
                  <View style={styles.appointmentActions}>
                    <TouchableOpacity 
                      style={[styles.appointmentBtn, styles.rejectBtn]}
                      onPress={() => handleAppointmentResponse(appointment.id, 'reject')}
                    >
                      <Text style={styles.btnText}>Rechazar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.appointmentBtn, styles.confirmBtn]}
                      onPress={() => handleAppointmentResponse(appointment.id, 'confirm')}
                    >
                      <Text style={[styles.btnText, styles.confirmText]}>Confirmar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
          
          {/* Emergencias activas */}
          {activeEmergencies && activeEmergencies.length > 0 && (
            <View style={styles.emergenciesSection}>
              <Text style={styles.sectionTitle}>Emergencias activas</Text>
              <FlatList
                data={activeEmergencies}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={item => item._id}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.emergencyCard}
                    onPress={() => navigation.navigate('EmergencyDetails', { emergencyId: item._id })}
                  >
                    <View style={styles.emergencyHeader}>
                      <Text style={styles.emergencyTime}>Hace {Math.floor((Date.now() - new Date(item.createdAt).getTime()) / 60000)} min</Text>
                      <View style={styles.emergencyStatus}>
                        <Text style={styles.emergencyStatusText}>Urgente</Text>
                      </View>
                    </View>
                    <Text style={styles.emergencyType}>{item.tipoEmergencia || 'Emergencia'}</Text>
                    <Text style={styles.emergencyClient}>{item.usuario.nombre}</Text>
                    <Text style={styles.emergencyDistance}>{item.distancia || '2.5'} km</Text>
                    <TouchableOpacity style={styles.emergencyBtn}>
                      <Text style={styles.emergencyBtnText}>Atender</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}
        </ScrollView>
      );
    } else {
      // Renderizar vista para usuarios
      return (
        <ScrollView 
          style={styles.container}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#4A80F0']}
            />
          }
        >
          <View style={styles.header}>
            <Text style={styles.welcomeText}>¡Hola!</Text>
            <Text style={styles.subtitleText}>¿Qué necesitas hoy?</Text>
          </View>
          
          {/* Sección de emergencia */}
          <TouchableOpacity 
            style={styles.emergencyBanner}
            onPress={handleEmergencyRequest}
          >
            <View style={styles.emergencyContent}>
              <Ionicons name="alert-circle" size={28} color="#fff" />
              <View style={styles.emergencyTextContainer}>
                <Text style={styles.emergencyTitle}>¿Tienes una emergencia?</Text>
                <Text style={styles.emergencySubtitle}>Conecta con un veterinario ahora</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#fff" />
          </TouchableOpacity>
          
          {/* Servicios */}
          <View style={styles.servicesContainer}>
            <Text style={styles.sectionTitle}>Nuestros servicios</Text>
            <View style={styles.servicesGrid}>
              {services.map((service) => (
                <ServiceCard 
                  key={service.id}
                  service={service}
                  onPress={() => handleServiceSelect(service)}
                />
              ))}
            </View>
          </View>
          
          {/* Veterinarios destacados */}
          <View style={styles.vetsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Veterinarios destacados</Text>
              <TouchableOpacity onPress={() => navigation.navigate('VetsDirectory')}>
                <Text style={styles.seeAllText}>Ver todos</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={featuredVets}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={item => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.vetCard}
                  onPress={() => navigation.navigate('VetProfile', { vetId: item.id })}
                >
                  <View style={styles.vetImageContainer}>
                    {item.image ? (
                      <Image source={{ uri: item.image }} style={styles.vetImage} />
                    ) : (
                      <View style={styles.vetPlaceholder}>
                        <Text style={styles.vetPlaceholderText}>{item.name.substring(0, 1)}</Text>
                      </View>
                    )}
                    {item.available && (
                      <View style={styles.availableBadge}>
                        <View style={styles.availableDot} />
                        <Text style={styles.availableText}>Disponible</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.vetName}>{item.name}</Text>
                  <Text style={styles.vetSpecialty}>{item.specialty}</Text>
                  <View style={styles.vetRating}>
                    <Ionicons name="star" size={14} color="#FFD700" />
                    <Text style={styles.vetRatingText}>{item.rating}</Text>
                    <Text style={styles.vetReviews}>({item.reviews} reseñas)</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
          
          {/* Veterinarios disponibles para emergencias */}
          <View style={styles.vetsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Disponibles para emergencias</Text>
              <TouchableOpacity onPress={() => navigation.navigate('EmergencyVets')}>
                <Text style={styles.seeAllText}>Ver todos</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={availableVetsList}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={item => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.availableVetCard}
                  onPress={() => navigation.navigate('EmergencyRequest', { vetId: item.id })}
                >
                  <View style={styles.availableVetTop}>
                    <View style={styles.vetImageContainer}>
                      {item.image ? (
                        <Image source={{ uri: item.image }} style={styles.vetImage} />
                      ) : (
                        <View style={styles.vetPlaceholder}>
                          <Text style={styles.vetPlaceholderText}>{item.name.substring(0, 1)}</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.availableVetInfo}>
                      <Text style={styles.availableVetName}>{item.name}</Text>
                      <Text style={styles.availableVetSpecialty}>{item.specialty}</Text>
                      <View style={styles.vetRating}>
                        <Ionicons name="star" size={14} color="#FFD700" />
                        <Text style={styles.vetRatingText}>{item.rating}</Text>
                      </View>
                      <Text style={styles.availableVetDistance}>{item.distance}</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.requestVetButton}>
                    <Text style={styles.requestVetButtonText}>Solicitar</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              )}
            />
          </View>
        </ScrollView>
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="auto" />
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A80F0" />
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      ) : (
        renderContent()
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA'
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    padding: 15
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#4A80F0'
  },
  header: {
    marginTop: 10,
    marginBottom: 20
  },
  welcomeText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333'
  },
  subtitleText: {
    fontSize: 16,
    color: '#666',
    marginTop: 5
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 15,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  switchLabel: {
    fontSize: 16,
    color: '#333'
  },
  statsContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 15
  },
  statItem: {
    width: '48%',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center'
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4A80F0',
    marginBottom: 5
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center'
  },
  emergencyBanner: {
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  emergencyContent: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  emergencyTextContainer: {
    marginLeft: 10
  },
  emergencyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff'
  },
  emergencySubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9
  },
  servicesContainer: {
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  vetsSection: {
    marginBottom: 20
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15
  },
  seeAllText: {
    color: '#4A80F0',
    fontSize: 14
  },
  vetCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginRight: 15,
    width: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  vetImageContainer: {
    position: 'relative',
    marginBottom: 10,
    alignItems: 'center'
  },
  vetImage: {
    width: 80,
    height: 80,
    borderRadius: 40
  },
  vetPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4A80F0',
    justifyContent: 'center',
    alignItems: 'center'
  },
  vetPlaceholderText: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#fff'
  },
  availableBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1
  },
  availableDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF50',
    marginRight: 5
  },
  availableText: {
    fontSize: 10,
    color: '#4CAF50'
  },
  vetName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 3
  },
  vetSpecialty: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5
  },
  vetRating: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  vetRatingText: {
    marginLeft: 5,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333'
  },
  vetReviews: {
    marginLeft: 5,
    fontSize: 12,
    color: '#999'
  },
  availableVetCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginRight: 15,
    width: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  availableVetTop: {
    flexDirection: 'row',
    marginBottom: 10
  },
  availableVetInfo: {
    marginLeft: 10,
    flex: 1
  },
  availableVetName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  availableVetSpecialty: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3
  },
  availableVetDistance: {
    fontSize: 12,
    color: '#999',
    marginTop: 3
  },
  requestVetButton: {
    backgroundColor: '#4A80F0',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 5
  },
  requestVetButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14
  },
  pendingSection: {
    marginBottom: 20
  },
  appointmentCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  appointmentDate: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4A80F0'
  },
  appointmentType: {
    fontSize: 14,
    color: '#666'
  },
  appointmentDetails: {
    marginBottom: 15
  },
  appointmentClient: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 3
  },
  appointmentPet: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3
  },
  appointmentLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3
  },
  appointmentAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3
  },
  appointmentReason: {
    fontSize: 14,
    color: '#666'
  },
  appointmentActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end'
  },
  appointmentBtn: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginLeft: 10
  },
  rejectBtn: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd'
  },
  confirmBtn: {
    backgroundColor: '#4A80F0'
  },
  btnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666'
  },
  confirmText: {
    color: '#fff'
  },
  emergenciesSection: {
    marginBottom: 20
  },
  emergencyCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginRight: 15,
    width: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  emergencyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  emergencyTime: {
    fontSize: 12,
    color: '#999'
  },
  emergencyStatus: {
    backgroundColor: '#FF6B6B',
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 2
  },
  emergencyStatusText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold'
  },
  emergencyType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5
  },
  emergencyClient: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5
  },
  emergencyDistance: {
    fontSize: 14,
    color: '#999',
    marginBottom: 10
  },
  emergencyBtn: {
    backgroundColor: '#4A80F0',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center'
  },
  emergencyBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14
  }
});

export default HomeScreen;
