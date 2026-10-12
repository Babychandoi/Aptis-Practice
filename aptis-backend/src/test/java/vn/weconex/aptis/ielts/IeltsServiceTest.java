package vn.weconex.aptis.ielts;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import java.nio.file.Path;
import java.nio.file.Files;
import com.fasterxml.jackson.databind.ObjectMapper;
import vn.weconex.aptis.asset.repository.AssetRepository;
import vn.weconex.aptis.asset.service.MinioStorageClient;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.exception.ErrorCode;
import vn.weconex.aptis.common.security.*;
import vn.weconex.aptis.entitlement.service.EntitlementService;
import vn.weconex.aptis.ielts.IeltsModels.*;
class IeltsServiceTest {
    IeltsExamRepository exams=mock(IeltsExamRepository.class);
    IeltsAttemptRepository attempts=mock(IeltsAttemptRepository.class);
    CurrentUser user=mock(CurrentUser.class);
    AssetRepository assets=mock(AssetRepository.class);
    EntitlementService entitlements=mock(EntitlementService.class);
    IeltsService service=new IeltsService(exams,attempts,user,entitlements,assets,mock(MinioStorageClient.class));
    @BeforeEach void setup() {
        when(user.requireUserId()).thenReturn("student");
        when(user.require()).thenReturn(new AuthPrincipal("student",Set.of("STUDENT"),Set.of()));
        when(attempts.save(any())).thenAnswer(i->i.getArgument(0));
    }
    Attempt attempt() {
        var q=new Question("q",Type.SHORT_TEXT,"Where?",List.of(),List.of("secret-answer"),"secret-explanation",1,null,null);
        Attempt a=new Attempt();a.setId("a");a.setUserId("student");a.setTitle("Practice");a.setTrack(Track.ACADEMIC);
        a.setVersion(0L);a.setActiveSkill(Skill.READING);a.setDeadline(Instant.now().plusSeconds(600));
        a.setSnapshot(List.of(new Group("g",Skill.READING,1,"Reading","","Passage",null,List.of(q))));
        when(attempts.findById("a")).thenReturn(Optional.of(a));return a;
    }
    @Test void publicAttemptNeverSerializesAnswerKeyOrExplanationBeforeSubmission() throws Exception {
        attempt();String json=new ObjectMapper().findAndRegisterModules().writeValueAsString(service.get("a"));
        assertFalse(json.contains("secret-answer"));assertFalse(json.contains("secret-explanation"));assertFalse(json.contains("snapshot"));
        var result=service.submitSkill("a",Skill.READING);
        assertEquals(List.of("secret-answer"),result.answers().get("q").acceptedAnswers());
    }
    @Test void deniesAnotherUsersAttempt() {
        var a=attempt();a.setUserId("other");assertEquals(ErrorCode.ATTEMPT_NOT_OWNED,assertThrows(ApiException.class,()->service.get("a")).code());
    }
    @Test void rejectsStaleAutosaveAndAnswersOutsideActiveSkill() {
        attempt();assertEquals(ErrorCode.CONFLICT,assertThrows(ApiException.class,()->service.saveResponses("a",1L,Map.of())).code());
        assertEquals(ErrorCode.VALIDATION_FAILED,assertThrows(ApiException.class,()->service.saveResponses("a",0L,Map.of("unknown",new Response("x",null,null)))).code());
        verify(attempts,never()).save(any());
    }
    @Test void rejectsExpiredSaveButAllowsSubmissionOfAlreadyPersistedWork() {
        var a=attempt();a.setDeadline(Instant.now().minusSeconds(1));
        assertEquals(ErrorCode.ATTEMPT_EXPIRED,assertThrows(ApiException.class,()->service.saveResponses("a",0L,Map.of())).code());
        assertEquals(Status.COMPLETED,service.submitSkill("a",Skill.READING).status());
    }
    @Test void submittedSkillsAreImmutableAndSubmissionIsIdempotent() {
        attempt();service.submitSkill("a",Skill.READING);service.submitSkill("a",Skill.READING);
        verify(attempts,times(1)).save(any());
        assertEquals(ErrorCode.ATTEMPT_ALREADY_SUBMITTED,assertThrows(ApiException.class,()->service.saveResponses("a",0L,Map.of())).code());
    }
    @Test void studentCannotCreateExamsOrReview() {
        assertEquals(ErrorCode.FORBIDDEN,assertThrows(ApiException.class,()->service.saveExam(null,new Exam())).code());
        assertEquals(ErrorCode.FORBIDDEN,assertThrows(ApiException.class,()->service.reviewQueue(0)).code());
    }
    @Test void premiumCheckedOnServer() {
        Exam exam=new Exam();exam.setPublished(true);exam.setPremium(true);
        when(exams.findById("e")).thenReturn(Optional.of(exam));
        assertEquals(ErrorCode.PREMIUM_REQUIRED,assertThrows(ApiException.class,()->service.start("e")).code());
        verify(attempts,never()).save(any());
    }
    @Test void otherTeacherCannotReviewOrReadRecording() {
        var a=attempt();a.setStatus(Status.PENDING_REVIEW);a.setExamAuthorId("another-teacher");
        when(user.require()).thenReturn(new AuthPrincipal("student",Set.of("TEACHER"),Set.of()));
        assertEquals(ErrorCode.FORBIDDEN,assertThrows(ApiException.class,()->service.media("a","file",true)).code());
    }
    @Test void fullLengthReadingMustContainFortyQuestions() {
        var a=attempt();Exam exam=new Exam();exam.setTitle("Bad full test");exam.setTrack(Track.ACADEMIC);exam.setFullLength(true);exam.setPublished(true);exam.setGroups(a.getSnapshot());
        assertEquals(ErrorCode.VALIDATION_FAILED,assertThrows(ApiException.class,()->service.validate(exam)).code());
    }
    @Test void learnerCannotRequestUnreferencedAsset() {
        attempt();assertEquals(ErrorCode.FORBIDDEN,assertThrows(ApiException.class,()->service.media("a","private-file",false)).code());
        verifyNoInteractions(assets);
    }
    @ParameterizedTest @ValueSource(strings={"reading-practice.json","academic-writing.json","general-writing.json","speaking-practice.json"})
    void shippedSampleExamsPassTheSameServerValidationAsAuthoring(String filename) throws Exception {
        Path directory=Files.exists(Path.of("../docs/ielts"))?Path.of("../docs/ielts"):Path.of("../docs");
        Exam exam=new ObjectMapper().readValue(directory.resolve(filename).toFile(),Exam.class);
        assertDoesNotThrow(()->service.validate(exam));
        assertFalse(exam.isPublished());
        exam.setPublished(true);
        assertDoesNotThrow(()->service.validate(exam));
    }
}
