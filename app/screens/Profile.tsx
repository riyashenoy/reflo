import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { signOut } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { auth } from '../lib/firebase';
import { getAuthErrorMessage } from '../lib/authErrors';
import type { AuthStackParamList } from '../navigation';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList>;

function showComingSoon() {
  Alert.alert('Coming soon', 'This feature is not available yet.');
}

function SectionLabel({ title }: { title: string }) {
  return <Text style={styles.sectionLabel}>{title}</Text>;
}

function BodyRow({
  label,
  value,
  onPress,
  showDivider,
}: {
  label: string;
  value: string;
  onPress: () => void;
  showDivider?: boolean;
}) {
  return (
    <>
      {showDivider ? <View style={styles.rowDivider} /> : null}
      <Pressable style={styles.listRow} onPress={onPress}>
        <View style={styles.greyIcon} />
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
    </>
  );
}

function PreferenceRow({
  title,
  subtitle,
  value,
  onValueChange,
  showDivider,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  showDivider?: boolean;
}) {
  return (
    <>
      {showDivider ? <View style={styles.rowDivider} /> : null}
      <View style={styles.listRow}>
        <View style={styles.tealIcon} />
        <View style={styles.preferenceText}>
          <Text style={styles.rowLabel}>{title}</Text>
          <Text style={styles.rowSubtitle}>{subtitle}</Text>
        </View>
        <Switch value={value} onValueChange={onValueChange} />
      </View>
    </>
  );
}

export default function Profile() {
  const navigation = useNavigation<NavigationProp>();

  const [motionCapture, setMotionCapture] = useState(true);
  const [instructorVoice, setInstructorVoice] = useState(true);
  const [workoutMusic, setWorkoutMusic] = useState(true);
  const [reminders, setReminders] = useState(false);
  const [accountExpanded, setAccountExpanded] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut(auth);
      navigation.reset({
        index: 0,
        routes: [{ name: 'SignIn' }],
      });
    } catch (err) {
      Alert.alert('Sign out failed', getAuthErrorMessage(err));
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            <Text style={styles.avatarInitial}>R</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.name}>Riya Shenoy</Text>
            <Text style={styles.subtitle}>Some experience · Reformer</Text>
          </View>
        </View>
        <Pressable onPress={showComingSoon}>
          <Text style={styles.editLink}>Edit</Text>
        </Pressable>
      </View>

      <Pressable style={styles.mindfulCard} onPress={showComingSoon}>
        <Text style={styles.warningIcon}>⚠</Text>
        <View style={styles.mindfulText}>
          <Text style={styles.mindfulTitle}>Mindful Areas</Text>
          <Text style={styles.mindfulSubtitle}>Back, knees</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>

      <SectionLabel title="BODY" />
      <View style={styles.card}>
        <BodyRow label="Height" value="168 cm" onPress={showComingSoon} />
        <BodyRow
          label="Weight"
          value="62 kg"
          onPress={showComingSoon}
          showDivider
        />
        <BodyRow
          label="Age"
          value="28"
          onPress={showComingSoon}
          showDivider
        />
      </View>

      <SectionLabel title="PREFERENCES" />
      <View style={styles.card}>
        <PreferenceRow
          title="Motion Capture"
          subtitle="Real-time form corrections"
          value={motionCapture}
          onValueChange={setMotionCapture}
        />
        <PreferenceRow
          title="Instructor Voice"
          subtitle="AI Audio cues"
          value={instructorVoice}
          onValueChange={setInstructorVoice}
          showDivider
        />
        <PreferenceRow
          title="Workout Music"
          subtitle="Plays during class"
          value={workoutMusic}
          onValueChange={setWorkoutMusic}
          showDivider
        />
        <PreferenceRow
          title="Reminders"
          subtitle="Daily workout nudges"
          value={reminders}
          onValueChange={setReminders}
          showDivider
        />
      </View>

      <View style={styles.sectionDivider} />
      <Pressable
        style={styles.accountHeader}
        onPress={() => setAccountExpanded((prev) => !prev)}
      >
        <SectionLabel title="ACCOUNT SETTINGS" />
        <Text style={styles.chevron}>
          {accountExpanded ? '⌄' : '›'}
        </Text>
      </Pressable>

      {accountExpanded ? (
        <View style={styles.card}>
          <Pressable style={styles.listRow} onPress={showComingSoon}>
            <Text style={styles.rowLabel}>Email</Text>
            <Text style={styles.rowValue}>riya@example.com</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
          <View style={styles.rowDivider} />
          <Pressable
            style={styles.signOutRow}
            onPress={handleSignOut}
            disabled={signingOut}
          >
            <Text style={styles.signOutText}>
              {signingOut ? 'Signing out…' : 'Sign Out'}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f0eb',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#cc2200',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: '700',
    color: '#cc2200',
  },
  headerText: {
    flex: 1,
    paddingRight: 8,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#00000055',
  },
  editLink: {
    fontSize: 15,
    color: '#cc2200',
    fontWeight: '600',
  },
  mindfulCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E7',
    borderWidth: 0.5,
    borderColor: '#F0C04055',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  warningIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  mindfulText: {
    flex: 1,
  },
  mindfulTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  mindfulSubtitle: {
    fontSize: 13,
    color: '#00000055',
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1.5,
    color: '#00000044',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: '#0000000f',
    marginBottom: 20,
    overflow: 'hidden',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  greyIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#e8e6e0',
    marginRight: 12,
  },
  tealIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#1D9E7514',
    marginRight: 12,
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    color: '#1a1a1a',
  },
  rowValue: {
    fontSize: 14,
    color: '#00000055',
    marginRight: 8,
  },
  rowSubtitle: {
    fontSize: 12,
    color: '#00000055',
    marginTop: 2,
  },
  preferenceText: {
    flex: 1,
    paddingRight: 8,
  },
  chevron: {
    fontSize: 18,
    color: '#00000044',
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#0000000f',
    marginLeft: 14,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#00000014',
    marginBottom: 12,
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  signOutRow: {
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  signOutText: {
    fontSize: 15,
    color: '#cc2200',
    fontWeight: '600',
  },
});
