package vn.weconex.aptis.ielts;
import static org.junit.jupiter.api.Assertions.*;
import java.util.*;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import vn.weconex.aptis.ielts.IeltsModels.*;
class IeltsScoringTest {
    @Test void receptiveBandsFollowReferenceAnchorsAndVaryByTrack() {
        assertEquals(5, IeltsScoring.rawBand(16, Skill.LISTENING, Track.ACADEMIC));
        assertEquals(6, IeltsScoring.rawBand(23, Skill.LISTENING, Track.ACADEMIC));
        assertEquals(7, IeltsScoring.rawBand(30, Skill.READING, Track.ACADEMIC));
        assertEquals(6, IeltsScoring.rawBand(30, Skill.READING, Track.GENERAL_TRAINING));
        assertEquals(8, IeltsScoring.rawBand(35, Skill.LISTENING, Track.ACADEMIC));
        assertEquals(9, IeltsScoring.rawBand(40, Skill.LISTENING, Track.ACADEMIC));
        assertEquals(0, IeltsScoring.rawBand(0, Skill.READING, Track.ACADEMIC));
        assertThrows(IllegalArgumentException.class, () -> IeltsScoring.rawBand(41, Skill.LISTENING, Track.ACADEMIC));
    }
    @Test void textRespectsWordLimitAndAcceptsOnlyAuthorAlternatives() {
        var q=new Question("q",Type.SHORT_TEXT,"Question",List.of(),List.of("train station","station"),"",2,null,null);
        assertTrue(IeltsScoring.correct(q,new Response("  Train   Station  ",null,null)));
        assertFalse(IeltsScoring.correct(q,new Response("the train station",null,null)));
        assertFalse(IeltsScoring.correct(q,new Response("stations",null,null)));
        assertFalse(IeltsScoring.correct(q,null));
    }
    @Test void shortPracticeNeverCreatesRawBand() {
        var q=new Question("q",Type.SHORT_TEXT,"Question",List.of(),List.of("station"),"",2,null,null);
        var a=new Attempt();a.setTrack(Track.ACADEMIC);a.setFullLength(false);
        a.setSnapshot(List.of(new Group("g",Skill.READING,1,"","","",null,List.of(q))));
        a.getSubmittedSkills().add(Skill.READING);a.getResponses().put("q",new Response("station",null,null));
        assertNull(IeltsScoring.scores(a).get(Skill.READING).band());
        assertEquals(1,IeltsScoring.scores(a).get(Skill.READING).correct());
    }
    @Test void writingWaitsForBothTasksAndWeightsTaskTwoTwice() {
        var q1=new Question("w1",Type.LONG_TEXT,"Report",List.of(),List.of(),"",null,150,null);
        var q2=new Question("w2",Type.LONG_TEXT,"Essay",List.of(),List.of(),"",null,250,null);
        var a=new Attempt();a.setSnapshot(List.of(new Group("g1",Skill.WRITING,1,"","","",null,List.of(q1)),new Group("g2",Skill.WRITING,2,"","","",null,List.of(q2))));
        a.getSubmittedSkills().add(Skill.WRITING);
        a.getReviews().put("w1",review(3));assertNull(IeltsScoring.scores(a).get(Skill.WRITING).band());
        a.getReviews().put("w2",review(9));assertEquals(7,IeltsScoring.scores(a).get(Skill.WRITING).band());
        assertNull(IeltsScoring.overall(IeltsScoring.scores(a)));
    }
    @Test void overallRoundsQuarterUpAndRequiresAllFourBands() {
        Map<Skill,SkillResult> scores=new EnumMap<>(Skill.class);
        scores.put(Skill.LISTENING,new SkillResult(30,40,6.5,"ESTIMATED"));
        scores.put(Skill.READING,new SkillResult(30,40,6.5,"ESTIMATED"));
        scores.put(Skill.WRITING,new SkillResult(null,2,5.0,"TEACHER_ESTIMATE"));
        assertNull(IeltsScoring.overall(scores));
        scores.put(Skill.SPEAKING,new SkillResult(null,6,7.0,"TEACHER_ESTIMATE"));
        assertEquals(6.5,IeltsScoring.overall(scores));
        assertEquals(7,IeltsScoring.roundBand(6.75));
    }
    private static Review review(double score) {return new Review(Map.of("a",score,"b",score,"c",score,"d",score),"Feedback","teacher",Instant.now());}
}
